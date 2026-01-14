import { FC } from "react";

/**
 * Liability Disclaimer Footer Component
 * Globally injected on all tenant public sites
 * Required for AI-generated dietary tags
 */
export const LiabilityDisclaimer: FC = () => {
  return (
    <div className="w-full border-t border-gray-200 bg-amber-50 px-4 py-3 text-center text-xs text-gray-700">
      <p>
        <strong>Disclaimer:</strong> Dietary tags are AI-generated suggestions.
        Please confirm all allergen information and dietary restrictions with
        staff before ordering.
      </p>
    </div>
  );
};

export default LiabilityDisclaimer;
