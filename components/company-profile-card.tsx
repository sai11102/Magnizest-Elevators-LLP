import { Building2, User, Phone, Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CompanyProfileCard() {
  return (
    <Card className="border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/10 backdrop-blur-xl">
      <CardHeader className="space-y-3 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
          <Building2 className="h-6 w-6" />
        </div>
        <CardTitle className="text-lg font-semibold text-white">Company Profile</CardTitle>
        <CardDescription className="text-slate-300">
          Magnizest Elevators LLP provides premium AMC management and elevator service coverage with dispatch-ready support across Hyderabad.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 p-6 text-sm text-slate-200">
        <div className="space-y-1 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Company Name</p>
          <p className="font-semibold">Magnizest Elevators LLP</p>
        </div>
        <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-sky-300" />
            <span>J. Abhinav Kumar Reddy</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-emerald-300" />
            <span>040-23096856 | +91 9491003300</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-orange-300" />
            <span>abhinav@magnizest.com</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-sky-300" />
            <span>D-9, Phase IV (Ext), IDA Jeedimetla, Hyderabad, Telangana - 500055</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
