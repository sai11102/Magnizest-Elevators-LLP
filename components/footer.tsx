import { Phone, Mail, Copyright } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80 px-4 py-6 text-sm text-slate-300 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">Magnizest Elevators LLP</p>
          <p className="max-w-2xl text-xs leading-6 text-slate-400">
            D-9, Phase IV (Ext), IDA Jeedimetla, Hyderabad, Telangana - 500055.
          </p>
        </div>
        <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2 md:auto-cols-max md:grid-flow-col md:gap-6">
          <div className="flex items-center gap-2 text-slate-200">
            <Phone className="h-4 w-4 text-sky-300" />
            <span>040-23096856 | +91 9491003300</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200">
            <Mail className="h-4 w-4 text-sky-300" />
            <span>abhinav@magnizest.com</span>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-5 flex max-w-7xl items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-500">
        <span>Copyright © {new Date().getFullYear()} Magnizest Elevators LLP</span>
        <span className="flex items-center gap-1"><Copyright className="h-3.5 w-3.5 text-slate-400" /> AMC Management System</span>
      </div>
    </footer>
  );
}
