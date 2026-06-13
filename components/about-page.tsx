import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompanyProfileCard } from "@/components/company-profile-card";
import { ShieldCheck, Users, Building2, Wrench, Phone, Mail } from "lucide-react";

export function AboutPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-8 space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300">About Company</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Magnizest Elevators LLP — AMC Management Built for Reliability
        </h1>
        <p className="max-w-3xl text-slate-300">
          Magnizest Elevators LLP delivers modern elevator AMC services with transparent contract tracking, timely service schedules, and a premium customer experience for facility managers and building owners.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/10 backdrop-blur-xl">
            <CardHeader className="space-y-3 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl text-white">Our Promise</CardTitle>
              <CardDescription className="text-slate-300">
                We ensure seamless AMC management with prioritized maintenance, clear notifications, and a dependable elevator support lifecycle for every site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 text-slate-200">
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <Users className="h-5 w-5 text-sky-300" />
                <div>
                  <p className="font-semibold">Dedicated Operations</p>
                  <p className="text-sm text-slate-400">Specialized support for AMC workflows, service tracking, and customer satisfaction.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <Building2 className="h-5 w-5 text-emerald-300" />
                <div>
                  <p className="font-semibold">Regional Expertise</p>
                  <p className="text-sm text-slate-400">Operational coverage across Hyderabad with local service partners and rapid response.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <Wrench className="h-5 w-5 text-orange-300" />
                <div>
                  <p className="font-semibold">Service Driven</p>
                  <p className="text-sm text-slate-400">Automated notifications, service scheduling and AMC expiry alerts for reliable lift management.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/10 backdrop-blur-xl">
            <CardHeader className="space-y-2 p-6">
              <CardTitle className="text-lg text-white">Business Contact</CardTitle>
              <CardDescription className="text-slate-400">
                Reach out to our operations head for service coordination, contract support and AMC updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 text-slate-200">
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <Phone className="h-4 w-4 text-sky-300" />
                  <span>040-23096856 | +91 9491003300</span>
                </div>
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <Mail className="h-4 w-4 text-orange-300" />
                  <span>abhinav@magnizest.com</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <CompanyProfileCard />
      </div>
    </div>
  );
}
