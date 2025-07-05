import { requireAuth } from "@/lib/auth";
import { SecurityEvents } from "@/lib/audit";
import { headers } from "next/headers";

// Force dynamic rendering for authentication-dependent routes
// This is required because authentication checks use cookies
export const dynamic = 'force-dynamic';

/**
 * Protected Layout Component
 * 
 * This layout enforces authentication for all routes under the (protected) group.
 * It implements defense-in-depth security by providing centralized authentication
 * checks that complement the middleware-level protection.
 * 
 * Security Features:
 * - Centralized authentication enforcement
 * - Audit logging for access attempts
 * - Secure error handling without information disclosure
 * - Follows OWASP secure coding guidelines
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Enforce authentication at layout level for defense-in-depth security
    // This ensures all protected routes require authentication by default
    const user = await requireAuth();
    
    // Log successful access to protected area for security monitoring
    try {
      const headersList = await headers();
      const forwardedFor = headersList.get('x-forwarded-for');
      const realIp = headersList.get('x-real-ip');
      const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';
      
      await SecurityEvents.protectedAreaAccess(
        user.id,
        clientIp,
        'dashboard-layout'
      );
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error('Audit logging failed:', auditError);
    }
    
    return <>{children}</>;
  } catch (error) {
    // Handle authentication errors securely
    // The requireAuth function will handle redirects, but we catch any
    // unexpected errors to prevent information disclosure
    console.error('Protected layout error:', error);
    
    // Re-throw the error to let Next.js handle it appropriately
    // This maintains the redirect behavior from requireAuth
    throw error;
  }
}
