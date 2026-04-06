import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui';
import { BarChart3, Construction } from 'lucide-react';

export const AnalyticsPage = () => {
  const { t } = useTranslation();
 
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-fg-light dark:text-fg">{t('analytics.title')}</h1>
        <p className="text-fg-muted dark:text-fg-muted mt-1">{t('analytics.subtitle')}</p>
      </div>

      {/* Coming Soon */}
      <Card variant="glass" className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mb-6">
            <BarChart3 size={40} className="text-accent" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Construction size={24} className="text-warning" />
            <h2 className="text-2xl font-heading font-bold text-fg-light dark:text-fg">
              {t('analytics.coming_soon')}
            </h2>
          </div>
          <p className="text-fg-muted dark:text-fg-muted max-w-md">
            {t('analytics.description')}
          </p>
        </div>
      </Card>
    </div>
  );
};
