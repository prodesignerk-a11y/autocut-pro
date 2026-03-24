import Link from 'next/link';
import {
  Scissors,
  Zap,
  Clock,
  BarChart2,
  CheckCircle,
  ArrowRight,
  Play,
  Sparkles,
  Shield,
  Globe,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'AI-Powered Silence Detection',
    description:
      'Advanced FFmpeg-based VAD engine detects and removes pauses, silence, and dead air with millisecond precision.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Scissors,
    title: 'Three Processing Modes',
    description:
      'Choose Light (conservative), Medium (balanced), or Aggressive (maximum cuts) to match your content style.',
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
  },
  {
    icon: Clock,
    title: 'Save Hours of Editing',
    description:
      'What takes hours manually is done in minutes. Upload, configure, and download — it\'s that simple.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
];

const steps = [
  {
    number: '01',
    title: 'Upload Your Video',
    description: 'Drag & drop your video file. We support MP4, MOV, AVI, WebM, and MKV up to 2GB.',
  },
  {
    number: '02',
    title: 'Choose Processing Mode',
    description: 'Select Light, Medium, or Aggressive mode. Fine-tune padding and noise reduction settings.',
  },
  {
    number: '03',
    title: 'AI Processes Your Video',
    description: 'Our AI detects silence segments and builds an optimal cut timeline. Track progress in real-time.',
  },
  {
    number: '04',
    title: 'Download the Result',
    description: 'Get your edited video with silences removed. See the time saved and reduction percentage.',
  },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'For creators just getting started',
    features: [
      '5 videos per month',
      'Up to 200MB per file',
      'Up to 30 minutes',
      'Light & Medium modes',
      'Standard processing speed',
    ],
    cta: 'Get Started Free',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For serious content creators',
    features: [
      '50 videos per month',
      'Up to 2GB per file',
      'Up to 4 hours',
      'All processing modes',
      'Priority processing',
      'Noise reduction',
      'Voice overlap detection',
      'API access',
    ],
    cta: 'Start Pro',
    href: '/register?plan=pro',
    highlighted: true,
  },
  {
    name: 'Studio',
    price: '$79',
    period: '/month',
    description: 'For teams and agencies',
    features: [
      'Unlimited videos',
      'Up to 10GB per file',
      'Unlimited duration',
      'All processing modes',
      'Highest priority',
      'Advanced analytics',
      'Team collaboration',
      'Dedicated support',
    ],
    cta: 'Start Studio',
    href: '/register?plan=studio',
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
              <Scissors size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg">
              AutoCut<span className="text-primary-400"> Pro</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm font-medium mb-8">
            <Sparkles size={14} />
            AI-Powered Video Editing
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
            Edite vídeos{' '}
            <span className="gradient-text">automaticamente</span>
            {' '}com IA.
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Remova pausas, silêncios e partes mortas em minutos. Nossa IA analisa seu vídeo
            e cria uma timeline de corte perfeita automaticamente.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-500 hover:to-violet-500 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-glow hover:shadow-glow-lg"
            >
              <Zap size={18} />
              Start Editing Free
              <ArrowRight size={18} />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 text-gray-300 hover:text-white border border-white/10 hover:border-white/20 px-8 py-4 rounded-xl transition-all"
            >
              <Play size={16} className="fill-current" />
              See how it works
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16 pt-12 border-t border-white/5">
            {[
              { value: '40%+', label: 'Average reduction' },
              { value: '5 min', label: 'To process 1 hour' },
              { value: '2GB', label: 'Max file size' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black gradient-text">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything you need to edit faster
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Professional-grade video editing powered by FFmpeg and AI, accessible to everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description, color, bg }) => (
              <div
                key={title}
                className="p-6 rounded-2xl bg-surface-card border border-surface-border card-hover"
              >
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <Icon size={24} className={color} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>

          {/* Additional features grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: Shield, text: 'Secure file storage' },
              { icon: Globe, text: 'Cloudflare R2 CDN' },
              { icon: BarChart2, text: 'Detailed analytics' },
              { icon: Zap, text: 'Parallel processing' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 p-4 rounded-xl bg-surface-muted border border-surface-border"
              >
                <Icon size={16} className="text-primary-400 flex-shrink-0" />
                <span className="text-sm text-gray-300">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-surface-card/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How AutoCut Pro works</h2>
            <p className="text-gray-400 text-lg">
              From upload to download in four simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {steps.map(({ number, title, description }) => (
              <div key={number} className="flex gap-5 p-6 rounded-2xl bg-surface-card border border-surface-border">
                <div className="flex-shrink-0">
                  <span className="text-4xl font-black gradient-text">{number}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400 text-lg">Start free, upgrade when you need more.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(({ name, price, period, description, features: planFeatures, cta, href, highlighted }) => (
              <div
                key={name}
                className={`relative p-8 rounded-2xl border ${
                  highlighted
                    ? 'bg-gradient-to-b from-primary-900/40 to-surface-card border-primary-600/50 shadow-glow'
                    : 'bg-surface-card border-surface-border'
                }`}
              >
                {highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-600 text-white text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
                  <p className="text-gray-400 text-sm">{description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-black text-white">{price}</span>
                    {period && <span className="text-gray-400 ml-1">{period}</span>}
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {planFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle size={16} className="text-primary-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={href}
                  className={`block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
                    highlighted
                      ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-glow'
                      : 'bg-surface-muted hover:bg-surface-border text-white border border-surface-border'
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-b from-primary-900/30 to-surface-card border border-primary-600/20">
            <Scissors size={48} className="text-primary-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to edit smarter?
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Join thousands of creators who save hours every week with AutoCut Pro.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-500 hover:to-violet-500 text-white font-semibold px-10 py-4 rounded-xl transition-all shadow-glow hover:shadow-glow-lg"
            >
              <Zap size={18} />
              Start Editing Free
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scissors size={18} className="text-primary-400" />
            <span className="font-bold text-white">AutoCut Pro</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} AutoCut Pro. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
