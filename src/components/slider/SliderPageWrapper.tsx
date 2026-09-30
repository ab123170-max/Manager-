import React, { useRef } from 'react';
interface Props {activeSlideIndex:number;totalSlides:number;currentSlideTitle:string;onPrevSlide:()=>void;onNextSlide:()=>void;children:React.ReactNode;}
export const SliderPageWrapper:React.FC<Props>=({children})=><div className="relative min-h-0 pb-20">{children}</div>;
export default SliderPageWrapper;
