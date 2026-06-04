import React, { useEffect, useState } from 'react';
import './WarmupWrapper.css';

const WarmupWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [serverAwake, setServerAwake] = useState<boolean>(() => {
    return sessionStorage.getItem('serverAwake') === 'true';
  });

  useEffect(() => {
    if (serverAwake) return;

    let intervalId: ReturnType<typeof setInterval>;
    
    // Fallback to local url if env variable is missing
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const healthUrl = apiBase.endsWith('/api') 
        ? apiBase.replace('/api', '/api/health') 
        : `${apiBase}/health`;

    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        
        const response = await fetch(healthUrl, {
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          sessionStorage.setItem('serverAwake', 'true');
          setServerAwake(true);
          clearInterval(intervalId);
        }
      } catch (error) {
        // Silently handle errors (network failure, timeout) during boot phase
        console.log("Server still booting...");
      }
    };

    // Initial check
    checkHealth();

    // Poll every 3 seconds
    intervalId = setInterval(checkHealth, 3000);

    return () => clearInterval(intervalId);
  }, [serverAwake]);

  if (serverAwake) {
    return <>{children}</>;
  }

  return (
    <div className="warmup-container">
      <div className="warmup-content">
        <div className="warmup-logo-container">
          <img 
            src="/Loading logo.jpeg" 
            alt="Plum Logo" 
            className="warmup-logo-img" 
          />
        </div>

        <h2 className="warmup-title">
          Waking up the server
        </h2>
        <p className="warmup-text">
          Our free tier backend is spinning up. This cold boot takes about 30-45 seconds.
        </p>
        
        {/* Progress simulator */}
        <div className="progress-track">
          <div className="progress-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default WarmupWrapper;
