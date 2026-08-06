import { useState } from 'react';
import AlertsTab from './AlertsTab';
import FCMTab from './FCMTab';
import RouteTab from './RouteTab';

const tabs = [
  { id: 'alerts', label: '🚨 Cảnh báo' },
  { id: 'fcm', label: '🔔 FCM' },
  { id: 'route', label: '🛣️ Lộ trình' },
] as const;

const RightPanel = () => {
  const [activeTab, setActiveTab] = useState<string>('alerts');

  return (
    <div className="w-full md:w-[290px] shrink-0 h-full flex flex-col border-l border-border bg-card/90 backdrop-blur-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-3 text-xs font-heading font-semibold transition-all ${activeTab === t.id ? 'text-[#00d4aa] border-b-2 border-[#00d4aa] bg-accent/30' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'fcm' && <FCMTab />}
        {activeTab === 'route' && <RouteTab />}
      </div>
    </div>
  );
};

export default RightPanel;
