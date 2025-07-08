export default function DirectoryLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  //   console.log("📁 Directory layout rendered, modal:", !!modal);
  //   console.log("📁 Modal content type:", typeof modal);
  //   console.log("📁 Modal content:", modal);

  return (
    <>
      {children}
      {modal}
    </>
  );
}
