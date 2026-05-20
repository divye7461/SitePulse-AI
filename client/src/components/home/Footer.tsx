/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChartNoAxesColumnIcon } from "lucide-react";
import { homefooterLinks } from "../../assets/assets";
import {
  SiX,
  SiInstagram,
  SiFacebook,
  SiTwitch,
} from "@icons-pack/react-simple-icons";

export default function Footer() {
  return (
    <footer className="relative border-t border-white/8 bg-background overflow-hidden">
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[120px] rounded-full bg-indigo-500/4 blur-[60px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-12">
          {/* Brand column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
                <ChartNoAxesColumnIcon size={15} className="text-white" />
              </div>
              <span className="text-base font-semibold tracking-tight text-foreground">
                SitePulse AI
              </span>
            </div>
            <p className="text-xs text-muted-foreground/50 mb-6 w-5/6 leading-relaxed">
              Optimize your website for search engines with AI-powered insights
              and real-time tracking.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: <SiX size={15} />, label: "X" },
                { icon: <SiInstagram size={15} />, label: "Instagram" },
                { icon: <SiFacebook size={15} />, label: "Facebook" },
                { icon: <SiTwitch size={15} />, label: "Twitch" },
              ].map(({ icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg border border-white/8 bg-white/3 flex items-center justify-center text-muted-foreground/50 hover:border-indigo-500/25 hover:bg-indigo-500/8 hover:text-indigo-400 transition-all duration-200"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {homefooterLinks.map((section: any) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-widest mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link: any) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-xs text-muted-foreground/45 hover:text-indigo-400 transition-colors duration-150 leading-none"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-7 border-t border-white/6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/35 tabular-nums">
            © {new Date().getFullYear()} RankPilot. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-muted-foreground/35">
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
