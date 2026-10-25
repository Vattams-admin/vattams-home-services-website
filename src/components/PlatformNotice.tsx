export default function PlatformNotice() {
  return (
    <aside className="border-y border-amber-200 bg-amber-50 text-navy-900" aria-label="Important platform notice">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <p className="font-bold">VATTAMS is a service-personnel listing and connection platform.</p>
        <p className="mt-1 text-sm leading-6">
          Independent service personnel may list their services. Customers can contact a provider or submit a service request.
          VATTAMS does not itself perform every listed service. A request does not guarantee a response, appointment, provider assignment
          or job completion. Confirm availability, final pricing and service details with the relevant provider.
        </p>
        <p className="mt-2 text-xs leading-5">
          Insurance-related and other regulated services are listed only where legally permitted and through appropriately authorised or qualified providers.
        </p>
      </div>
    </aside>
  );
}
