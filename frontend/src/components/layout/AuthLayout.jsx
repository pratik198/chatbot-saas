/**
 * AuthLayout — split-screen shell for Login / Register.
 *
 * Left  (lg+): immersive gradient brand panel with an animated aurora, the
 *              Lumina wordmark, a headline, and product proof points.
 * Right:       the form, vertically centered, on the app canvas.
 */
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Zap } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import ThemeToggle from '@/components/theme/ThemeToggle';

const POINTS = [
  { icon: Sparkles, title: 'Train on your own data', desc: 'Upload PDFs and FAQs — answers grounded in your content.' },
  { icon: Zap, title: 'Deploy in minutes', desc: 'Drop one snippet on your site and go live instantly.' },
  { icon: ShieldCheck, title: 'Private & secure', desc: 'Your knowledge base stays yours. Always.' },
];

export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen w-full bg-background lg:grid lg:grid-cols-2">
      {/* theme toggle floats top-right */}
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* ── Brand panel ─────────────────────────────────────── */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between p-12 text-white">
        {/* gradient base */}
        <div className="absolute inset-0 bg-brand-gradient" />
        {/* animated aurora blobs */}
        <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light">
          <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-white/30 blur-3xl animate-aurora" />
          <div className="absolute right-0 top-1/2 h-[28rem] w-[28rem] rounded-full bg-fuchsia-300/40 blur-3xl animate-aurora [animation-delay:-6s]" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-sky-300/40 blur-3xl animate-aurora [animation-delay:-12s]" />
        </div>
        {/* subtle grid */}
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

        <div className="relative z-10">
          <Link to="/" className="inline-flex">
            <Logo size={40} showWordmark wordmarkClassName="text-xl [&>span]:text-white [&_.gradient-text]:!bg-none [&_.gradient-text]:!text-white" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-md"
        >
          <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight">
            Build AI chatbots that actually know your business.
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Lumina turns your documents into a smart assistant your customers can talk to — 24/7.
          </p>

          <div className="mt-10 space-y-5">
            {POINTS.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-sm text-white/70">{p.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <div className="relative z-10 text-sm text-white/60">
          © {new Date().getFullYear()} Lumina AI · Crafted for modern teams
        </div>
      </div>

      {/* ── Form panel ──────────────────────────────────────── */}
      <div className="flex min-h-screen items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* mobile brand */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo size={40} showWordmark wordmarkClassName="text-xl" />
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
