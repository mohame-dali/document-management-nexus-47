import { Toaster as Sonner } from "sonner"
import { useLanguage } from "@/contexts/LanguageProvider"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ position, dir, ...props }: ToasterProps) => {
  const { language } = useLanguage()
  const resolvedDir = dir ?? (language === "ar" ? "rtl" : "ltr")
  const resolvedPosition = position ?? (resolvedDir === "rtl" ? "top-left" : "top-right")

  return (
    <Sonner
      theme="light"
      dir={resolvedDir}
      position={resolvedPosition}
      richColors
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#0f172a] group-[.toaster]:border-[1.5px] group-[.toaster]:border-[#cbd5e1] group-[.toaster]:rounded group-[.toaster]:shadow-md",
          description: "group-[.toast]:text-[#334155]",
          actionButton:
            "group-[.toast]:bg-[#2c5282] group-[.toast]:text-white group-[.toast]:rounded",
          cancelButton:
            "group-[.toast]:bg-[#f1f5f9] group-[.toast]:text-[#0f172a] group-[.toast]:rounded",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
