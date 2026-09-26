import DisclaimerBanner from "@/components/DisclaimerBanner";

export default function ConsultLayout({
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