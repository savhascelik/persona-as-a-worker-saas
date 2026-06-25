import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb"
import { awsCredentialsProvider } from "@vercel/functions/oidc"
import { STARTER_GRANT } from "./billing"
import type { Company, CompanyInput, Persona, PersonaInput, SkillTemplate } from "./types"

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME

/**
 * The connected table uses a composite primary key: partition key `PK` (HASH)
 * and sort key `SK` (RANGE). We use a single-table design where every entity
 * type shares a partition and is addressed by its id in the sort key:
 *   - Companies:       PK = "COMPANY", SK = <companyId>
 *   - Personas:        PK = "PERSONA", SK = <personaId>
 *   - Skill templates: PK = "SKILL",   SK = <skillId>
 * This lets us Query an entire entity type in one call instead of scanning.
 */
const PK = "PK"
const SK = "SK"
const COMPANY_PARTITION = "COMPANY"
const PERSONA_PARTITION = "PERSONA"
const SKILL_PARTITION = "SKILL"

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN as string,
    clientConfig: { region: process.env.AWS_REGION },
  }),
})

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

/* -------------------------------------------------------------------------- */
/*  Companies (tenants)                                                       */
/* -------------------------------------------------------------------------- */

export async function getAllCompanies(): Promise<Company[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: { "#pk": PK },
      ExpressionAttributeValues: { ":pk": COMPANY_PARTITION },
    }),
  )
  const companies = (result.Items || []) as Company[]
  return companies.sort((a, b) => a.createdAt - b.createdAt)
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { [PK]: COMPANY_PARTITION, [SK]: id },
    }),
  )
  return (result.Item as Company) || null
}

export async function createCompany(id: string, input: CompanyInput): Promise<Company> {
  const company: Company = {
    id,
    entityType: "company",
    name: input.name,
    domain: input.domain,
    baseUrl: input.baseUrl,
    role: "MANAGER",
    totalCredits: STARTER_GRANT,
    creditsConsumed: 0,
    createdAt: Date.now(),
  }
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { [PK]: COMPANY_PARTITION, [SK]: id, ...company },
    }),
  )
  return company
}

/**
 * Adds credits to a company's balance (e.g. after purchasing a Seeding
 * Package). Returns the updated company.
 */
export async function addCredits(id: string, amount: number): Promise<Company | null> {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { [PK]: COMPANY_PARTITION, [SK]: id },
      UpdateExpression: "SET totalCredits = if_not_exists(totalCredits, :zero) + :amt",
      ExpressionAttributeValues: { ":amt": amount, ":zero": 0 },
      ReturnValues: "ALL_NEW",
    }),
  )
  return (result.Attributes as Company) || null
}

/**
 * Deducts credits consumed by persona actions. Clamps the balance at zero and
 * tracks cumulative consumption. Returns the updated company.
 */
export async function deductCredits(id: string, amount: number): Promise<Company | null> {
  if (amount <= 0) return getCompanyById(id)
  const company = await getCompanyById(id)
  if (!company) return null
  const spend = Math.min(amount, company.totalCredits)
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { [PK]: COMPANY_PARTITION, [SK]: id },
      UpdateExpression:
        "SET totalCredits = :remaining, creditsConsumed = if_not_exists(creditsConsumed, :zero) + :spend",
      ExpressionAttributeValues: {
        ":remaining": company.totalCredits - spend,
        ":spend": spend,
        ":zero": 0,
      },
      ReturnValues: "ALL_NEW",
    }),
  )
  return (result.Attributes as Company) || null
}

/* -------------------------------------------------------------------------- */
/*  Personas                                                                  */
/* -------------------------------------------------------------------------- */

export async function getAllPersonas(): Promise<Persona[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: { "#pk": PK },
      ExpressionAttributeValues: { ":pk": PERSONA_PARTITION },
    }),
  )

  const personas = (result.Items || []) as Persona[]
  return personas.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getPersonaById(id: string): Promise<Persona | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { [PK]: PERSONA_PARTITION, [SK]: id },
    }),
  )

  return (result.Item as Persona) || null
}

export async function createPersona(id: string, input: PersonaInput): Promise<Persona> {
  const now = Date.now()
  const persona: Persona = {
    id,
    entityType: "persona",
    ...input,
    status: "seeding",
    postsPublished: 0,
    engagementScore: 0,
    creditsSpent: 0,
    createdAt: now,
    lastActiveAt: now,
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { [PK]: PERSONA_PARTITION, [SK]: id, ...persona },
    }),
  )

  return persona
}

export async function updatePersona(
  id: string,
  updates: Partial<Omit<Persona, "id" | "createdAt" | "entityType">>,
): Promise<Persona | null> {
  const expressionParts: string[] = []
  const expressionAttributeNames: Record<string, string> = {}
  const expressionAttributeValues: Record<string, unknown> = {}

  // Never allow the key attributes or immutable fields to be overwritten.
  const immutable = new Set(["PK", "SK", "id", "entityType", "createdAt"])

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || immutable.has(key)) continue
    expressionParts.push(`#${key} = :${key}`)
    expressionAttributeNames[`#${key}`] = key
    expressionAttributeValues[`:${key}`] = value
  }

  if (expressionParts.length === 0) {
    return getPersonaById(id)
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { [PK]: PERSONA_PARTITION, [SK]: id },
      UpdateExpression: `SET ${expressionParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    }),
  )

  return (result.Attributes as Persona) || null
}

export async function deletePersona(id: string): Promise<boolean> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { [PK]: PERSONA_PARTITION, [SK]: id },
    }),
  )

  return true
}

/* -------------------------------------------------------------------------- */
/*  Skill templates (admin-authored)                                          */
/* -------------------------------------------------------------------------- */

export async function getAllSkillTemplates(): Promise<SkillTemplate[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: { "#pk": PK },
      ExpressionAttributeValues: { ":pk": SKILL_PARTITION },
    }),
  )
  const skills = (result.Items || []) as SkillTemplate[]
  return skills.sort((a, b) => b.createdAt - a.createdAt)
}

export async function createSkillTemplate(
  id: string,
  template: Omit<SkillTemplate, "id" | "entityType" | "createdAt">,
): Promise<SkillTemplate> {
  const skill: SkillTemplate = {
    id,
    entityType: "skill",
    createdAt: Date.now(),
    ...template,
  }
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { [PK]: SKILL_PARTITION, [SK]: id, ...skill },
    }),
  )
  return skill
}

export async function deleteSkillTemplate(id: string): Promise<boolean> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { [PK]: SKILL_PARTITION, [SK]: id },
    }),
  )
  return true
}
