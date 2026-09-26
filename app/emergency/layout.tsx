import DisclaimerBanner from "@/components/DisclaimerBanner";

export default function EmergencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <DisclaimerBanner />
    </>
  );
}