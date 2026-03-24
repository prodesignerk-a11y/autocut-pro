'use client';

import { CheckCircle, Zap, Star, Building } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started',
    icon: Star,
    features: [
      '5 videos per month',
      'Up to 200MB per file',
      'Up to 30 minutes',
      'Light & Medium modes',
      'Standard processing',
    ],
    cta: 'Current Plan',
    active: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For professional creators',
    icon: Zap,
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
    cta: 'Upgrade to Pro',
    active: false,
    highlighted: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '$79',
    period: '/month',
    description: 'For teams and agencies',
    icon: Building,
    features: [
      'Unlimited videos',
      'Up to 10GB per file',
      'Unlimited duration',
      'All processing modes',
      'Highest priority',
      'Team management',
      'Advanced analytics',
      'Dedicated support',
    ],
    cta: 'Upgrade to Studio',
    active: false,
  },
];

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Plans</h1>
        <p className="text-gray-400 mt-1">
          Manage your subscription and usage
        </p>
      </div>

      {/* Current plan summary */}
      <Card className="bg-primary-900/20 border-primary-600/30">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-white">Free Plan</p>
              <Badge variant="purple">Active</Badge>
            </div>
            <p className="text-sm text-gray-400">0 / 5 videos used this month</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">$0</p>
            <p className="text-xs text-gray-500">/month</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Monthly usage</span>
            <span>0 / 5</span>
          </div>
          <div className="h-2 bg-surface-border rounded-full overflow-hidden">
            <div className="h-full w-0 bg-primary-500 rounded-full" />
          </div>
        </div>
      </Card>

      {/* Plan cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map(({ id, name, price, period, description, icon: Icon, features, cta, active, highlighted }) => (
            <div
              key={id}
              className={`relative p-6 rounded-2xl border ${
                highlighted
                  ? 'bg-primary-900/20 border-primary-600/40 shadow-glow'
                  : 'bg-surface-card border-surface-border'
              }`}
            >
              {highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    highlighted ? 'bg-primary-600/20' : 'bg-surface-muted'
                  }`}
                >
                  <Icon
                    size={18}
                    className={highlighted ? 'text-primary-400' : 'text-gray-400'}
                  />
                </div>
                <div>
                  <p className="font-bold text-white">{name}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </div>

              <div className="mb-5">
                <span className="text-3xl font-black text-white">{price}</span>
                {period && <span className="text-gray-400 text-sm ml-1">{period}</span>}
              </div>

              <ul className="space-y-2 mb-6">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle
                      size={14}
                      className={highlighted ? 'text-primary-400 mt-0.5 flex-shrink-0' : 'text-gray-500 mt-0.5 flex-shrink-0'}
                    />
                    <span className="text-xs text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={active ? 'ghost' : highlighted ? 'primary' : 'outline'}
                size="sm"
                className="w-full"
                disabled={active}
              >
                {cta}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <h3 className="font-semibold text-white mb-4">Billing FAQ</h3>
        <div className="space-y-4">
          {[
            {
              q: 'Can I cancel my subscription anytime?',
              a: 'Yes, you can cancel at any time. Your plan will remain active until the end of the current billing period.',
            },
            {
              q: 'What happens if I exceed my monthly limit?',
              a: 'Your uploads will be temporarily paused until the next billing cycle or until you upgrade your plan.',
            },
            {
              q: 'Is my payment information secure?',
              a: 'All payments are processed securely through Stripe. We never store your credit card details.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="pb-4 border-b border-surface-border last:border-0 last:pb-0">
              <p className="text-sm font-medium text-white mb-1">{q}</p>
              <p className="text-sm text-gray-400">{a}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
