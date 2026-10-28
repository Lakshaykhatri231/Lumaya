import React from 'react';

const LoadingDots = () => {
  return (
    <div className="flex space-x-1">
      <div className="animate-bounce bg-gray-400 rounded-full w-2 h-2 delay-0"></div>
      <div className="animate-bounce bg-gray-400 rounded-full w-2 h-2 delay-75"></div>
      <div className="animate-bounce bg-gray-400 rounded-full w-2 h-2 delay-150"></div>
    </div>
  );
};

export default LoadingDots;