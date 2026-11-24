import { redirect } from 'next/navigation';

/** Moved: student access requests now live under Enrollment Management. */
export default function AdminEnrollmentRequestsPage() {
    redirect('/admin/enrollments?tab=requests');
}
