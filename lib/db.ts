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
import type { Company, CompanyInput, Persona, PersonaInput } from "./types"

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME

/**
 * The connected table uses a composite primary key: partition key `PK` (HASH)
 * and sort key `SK` (RANGE). We use a single-table design where every entity
 * type shares a partition and is addressed by its id in the sort key:
 *   - Companies: PK = "COMPANY", SK = <companyId>
 *   - Personas:  PK = "PERSONA", SK = <personaId>
 * This lets us Query an entire entity type in one call instead of scanning.
 */
const PK = "PK"
const SK = "SK"
const COMPANY_PARTITION = "COMPANY"
const PERSONA_PARTITION = "PERSONA"

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

export async function createCompany(id: string, input: CompanyInput): Promise<Company> {
  const company: Company = {
    id,
    entityType: "company",
    ...input,
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
