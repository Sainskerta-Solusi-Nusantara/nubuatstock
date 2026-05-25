export function FormMessage({
  variant,
  children,
}: {
  variant: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const classes =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : variant === "success"
        ? "border-green-200 bg-green-50 text-green-700"
        : "border-blue-200 bg-blue-50 text-blue-700";
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-md border px-3 py-2 text-sm ${classes}`}
    >
      {children}
    </div>
  );
}
