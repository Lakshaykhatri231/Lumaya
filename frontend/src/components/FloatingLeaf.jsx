import React, { useEffect, useRef } from "react";

const FloatingLeaf = ({ className }) => {
  const leafRef = useRef(null);

  useEffect(() => {
    const leaf = leafRef.current;
    if (!leaf) return;

    let posX = Math.random() * window.innerWidth;
    let posY = Math.random() * window.innerHeight;
    let rotation = 0;
    const xSpeed = Math.random() * 2 - 1;
    const ySpeed = Math.random() * 1 + 0.5;
    const rotSpeed = Math.random() * 2 - 1;

    const animate = () => {
      if (!leaf) return;
      posX += xSpeed;
      posY += ySpeed;
      rotation += rotSpeed;

      // Boundaries check
      if (posX > window.innerWidth) posX = -50;
      if (posX < -50) posX = window.innerWidth;
      if (posY > window.innerHeight) posY = -50;

      leaf.style.left = `${posX}px`;
      leaf.style.top = `${posY}px`;
      leaf.style.transform = `rotate(${rotation}deg)`;

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div
      ref={leafRef}
      className={`absolute pointer-events-none ${className}`}
      style={{
        width: "30px",
        height: "30px",
        opacity: 0.7,
        position: "absolute", // Ensure positioning works
        left: "0px",
        top: "0px",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"
          fill="currentColor"
          className="text-white/40"
        />
      </svg>
    </div>
  );
};

export default FloatingLeaf;
