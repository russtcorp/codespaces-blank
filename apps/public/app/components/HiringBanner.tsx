/**
 * HiringBanner Component
 * 
 * Phase 3 Master Plan requirement:
 * Conditional rendering if business_settings.is_hiring === true
 * Shows sticky banner at bottom: "We are Hiring! Apply Now"
 */

interface HiringBannerProps {
  isHiring: boolean;
  businessName: string;
}

export function HiringBanner({ isHiring, businessName }: HiringBannerProps) {
  if (!isHiring) {
    return null;
  }
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-amber-500 px-4 py-3 text-center shadow-lg print:hidden">
      <p className="text-sm font-semibold text-white">
        🎉 We're Hiring! Join the {businessName} team.{' '}
        <a
          href="#hiring"
          className="underline hover:text-amber-100"
        >
          Apply Now
        </a>
      </p>
    </div>
  );
}
