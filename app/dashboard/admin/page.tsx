import { redirect } from "next/navigation"
import { currentUser, createClerkClient } from "@clerk/nextjs/server"
import { AdminClient } from "@/components/admin/admin-client"
import { getAllCompanies, getAllPersonas, getAllSkillTemplates, getAllCreditRequests } from "@/lib/db"
import type { Company, Persona, SkillTemplate } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  // Real, server-side role check. Only Clerk users whose public metadata
  // has `role: "admin"` may load the Admin Console.
  const user = await currentUser()
  console.log("DEBUG [AdminPage - Server]: User data:", {
    id: user?.id,
    email: user?.emailAddresses?.[0]?.emailAddress,
    publicMetadata: user?.publicMetadata
  })
  if (user?.publicMetadata?.role !== "admin") {
    redirect("/dashboard")
  }

  // Fetch registered users from Clerk
  let clerkUsers: { id: string; firstName: string | null; lastName: string | null; email: string; role: string }[] = []
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const response = await clerk.users.getUserList()
    clerkUsers = response.data.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.emailAddresses?.[0]?.emailAddress || "",
      role: (u.publicMetadata?.role as string) || "user"
    }))
  } catch (err) {
    console.error("[AdminPage] Error fetching users from Clerk, falling back:", err)
    clerkUsers = [
      {
        id: user?.id || "fallback-id",
        firstName: user?.firstName || "Admin",
        lastName: user?.lastName || "User",
        email: user?.emailAddresses?.[0]?.emailAddress || "admin@example.com",
        role: "admin"
      }
    ]
  }

  const [companies, personas, templates, creditRequests] = await Promise.all([
    getAllCompanies(),
    getAllPersonas(),
    getAllSkillTemplates(),
    getAllCreditRequests(),
  ])

  return (
    <AdminClient
      companies={companies}
      personas={personas}
      initialTemplates={templates}
      users={clerkUsers}
      initialCreditRequests={creditRequests}
    />
  )
}
