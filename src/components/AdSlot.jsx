import { useEffect } from 'react';

export default function AdSlot({ slotId }) {
  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense failed to push slot:', e);
    }
  }, [slotId]);

  return (
    <div 
      className="apex-ad-slot-wrapper" 
      style={{ 
        margin: '54px auto', 
        textAlign: 'center', 
        width: '100%', 
        minHeight: '100px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.01)',
        border: '1px dashed rgba(255,255,255,0.04)',
        borderRadius: '16px'
      }}
    >
      <ins 
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-2832011907708910"
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true" 
      />
    </div>
  );
}
