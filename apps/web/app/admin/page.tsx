import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAdminAuth } from '@/lib/firebase-admin'
import prisma from '@/lib/prisma'
import { SESSION_COOKIE_NAME } from '@/lib/auth-session'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!sessionCookie) {
        redirect('/')
    }

    try {
        const adminAuth = getAdminAuth()
        const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)

        const user = await prisma.user.findUnique({
            where: { firebaseUid: decodedToken.uid },
        })

        if (!user || user.role !== 'ADMIN') {
            redirect('/')
        }

        return <AdminDashboard adminUser={{ id: user.id, username: user.username, email: user.email }} />
    } catch {
        redirect('/')
    }
}
