import type { SpinnerDef } from './types';

// Attribution: https://github.com/shubhamjain/svg-spinners
// Animated "thinking" spinners. One is picked at random each time a response starts pending.
// To add your own, paste SVG markup as another entry. Any fill on the root <svg> is ignored:
// spinners are always drawn in the app accent color.
export const SPINNERS: SpinnerDef[] = [
  {
    name: "3-dots-bounce",
    svg: `<svg fill="hsl(228, 97%, 42%)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="12" r="3"><animate id="spinner_qFRN" begin="0;spinner_OcgL.end+0.25s" attributeName="cy" calcMode="spline" dur="0.6s" values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33"/></circle><circle cx="12" cy="12" r="3"><animate begin="spinner_qFRN.begin+0.1s" attributeName="cy" calcMode="spline" dur="0.6s" values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33"/></circle><circle cx="20" cy="12" r="3"><animate id="spinner_OcgL" begin="spinner_qFRN.begin+0.2s" attributeName="cy" calcMode="spline" dur="0.6s" values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33"/></circle></svg>`,
  },
  {
    name: "3-dots-fade",
    svg: `<svg fill="hsl(228, 97%, 42%)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="12" r="3" opacity="1"><animate id="spinner_qYjJ" begin="0;spinner_t4KZ.end-0.25s" attributeName="opacity" dur="0.75s" values="1;.2" fill="freeze"/></circle><circle cx="12" cy="12" r="3" opacity=".4"><animate begin="spinner_qYjJ.begin+0.15s" attributeName="opacity" dur="0.75s" values="1;.2" fill="freeze"/></circle><circle cx="20" cy="12" r="3" opacity=".3"><animate id="spinner_t4KZ" begin="spinner_qYjJ.begin+0.3s" attributeName="opacity" dur="0.75s" values="1;.2" fill="freeze"/></circle></svg>`,
  },
  {
    name: "3-dots-move",
    svg: `<svg fill="hsl(228, 97%, 42%)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="12" r="0"><animate begin="0;spinner_z0Or.end" attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3" fill="freeze"/><animate begin="spinner_OLMs.end" attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12" fill="freeze"/><animate begin="spinner_UHR2.end" attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20" fill="freeze"/><animate id="spinner_lo66" begin="spinner_Aguh.end" attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0" fill="freeze"/><animate id="spinner_z0Or" begin="spinner_lo66.end" attributeName="cx" dur="0.001s" values="20;4" fill="freeze"/></circle><circle cx="4" cy="12" r="3"><animate begin="0;spinner_z0Or.end" attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12" fill="freeze"/><animate begin="spinner_OLMs.end" attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20" fill="freeze"/><animate id="spinner_JsnR" begin="spinner_UHR2.end" attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0" fill="freeze"/><animate id="spinner_Aguh" begin="spinner_JsnR.end" attributeName="cx" dur="0.001s" values="20;4" fill="freeze"/><animate begin="spinner_Aguh.end" attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3" fill="freeze"/></circle><circle cx="12" cy="12" r="3"><animate begin="0;spinner_z0Or.end" attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20" fill="freeze"/><animate id="spinner_hSjk" begin="spinner_OLMs.end" attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0" fill="freeze"/><animate id="spinner_UHR2" begin="spinner_hSjk.end" attributeName="cx" dur="0.001s" values="20;4" fill="freeze"/><animate begin="spinner_UHR2.end" attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3" fill="freeze"/><animate begin="spinner_Aguh.end" attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12" fill="freeze"/></circle><circle cx="20" cy="12" r="3"><animate id="spinner_4v5M" begin="0;spinner_z0Or.end" attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0" fill="freeze"/><animate id="spinner_OLMs" begin="spinner_4v5M.end" attributeName="cx" dur="0.001s" values="20;4" fill="freeze"/><animate begin="spinner_OLMs.end" attributeName="r" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3" fill="freeze"/><animate begin="spinner_UHR2.end" attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12" fill="freeze"/><animate begin="spinner_Aguh.end" attributeName="cx" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20" fill="freeze"/></circle></svg>`,
  },
  {
    name: "3-dots-rotate",
    svg: `<svg fill="hsl(228, 97%, 42%)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3"/><g><circle cx="4" cy="12" r="3"/><circle cx="20" cy="12" r="3"/><animateTransform attributeName="transform" type="rotate" calcMode="spline" dur="1s" keySplines=".36,.6,.31,1;.36,.6,.31,1" values="0 12 12;180 12 12;360 12 12" repeatCount="indefinite"/></g></svg>`,
  },
  {
    name: "3-dots-scale-middle",
    svg: `<svg fill="hsl(228, 97%, 42%)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="12" r="1.5"><animate attributeName="r" dur="0.75s" values="1.5;3;1.5" repeatCount="indefinite"/></circle><circle cx="12" cy="12" r="3"><animate attributeName="r" dur="0.75s" values="3;1.5;3" repeatCount="indefinite"/></circle><circle cx="20" cy="12" r="1.5"><animate attributeName="r" dur="0.75s" values="1.5;3;1.5" repeatCount="indefinite"/></circle></svg>`,
  },
  {
    name: "3-dots-scale",
    svg: `<svg fill="hsl(228, 97%, 42%)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="12" r="3"><animate id="spinner_jObz" begin="0;spinner_vwSQ.end-0.25s" attributeName="r" dur="0.75s" values="3;.2;3"/></circle><circle cx="12" cy="12" r="3"><animate begin="spinner_jObz.end-0.6s" attributeName="r" dur="0.75s" values="3;.2;3"/></circle><circle cx="20" cy="12" r="3"><animate id="spinner_vwSQ" begin="spinner_jObz.end-0.45s" attributeName="r" dur="0.75s" values="3;.2;3"/></circle></svg>`,
  },
  // {
  //   name: '4-dots-gooey',
  //   svg: `<svg class="loader" viewBox="204 184 264 32"><style>@keyframes gooey {
  //           to {
  //               transform: translate3d(230px, 0, 0)
  //           }
  //       }

  //       .ellipse:nth-child(1) {
  //           animation: gooey 1s cubic-bezier(0.59, 0.8, 0.29, 0.1) infinite both alternate-reverse;
  //           animation-delay: 1s;
  //       }</style><defs><filter id="gooey" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="gooey"/><feBlend in="SourceGraphic" in2="gooey"/></filter></defs><g class="ellipses" fill="currentColor" filter="url(#gooey)"><ellipse class="ellipse" cx="220" cy="200" rx="16" ry="16"/><ellipse class="ellipse" cx="280" cy="200" rx="16" ry="16"/><ellipse class="ellipse" cx="340" cy="200" rx="16" ry="16"/><ellipse class="ellipse" cx="400" cy="200" rx="16" ry="16"/></g></svg>`
  // },
  // {
  //   name: '4-dots-rotate',
  //   svg: `<svg fill="hsl(228, 97%, 42%)" viewBox="0 -10 40 28" xmlns="http://www.w3.org/2000/svg"><style>@keyframes swing {
  //           0% {
  //               transform: rotate(0deg);
  //               animation-timing-function: ease-out;
  //           }

  //           25% {
  //               transform: rotate(50deg);
  //               animation-timing-function: ease-in;
  //           }

  //           50% {
  //               transform: rotate(0deg);
  //               animation-timing-function: linear;
  //           }
  //       }

  //       @keyframes swing2 {
  //           0% {
  //               transform: rotate(0deg);
  //               animation-timing-function: linear;
  //           }

  //           50% {
  //               transform: rotate(0deg);
  //               animation-timing-function: ease-out;
  //           }

  //           75% {
  //               transform: rotate(-50deg);
  //               animation-timing-function: ease-in;
  //           }
  //       }

  //       .first {
  //           animation: swing 1.2s linear infinite;
  //           transform-origin: center top;
  //       }

  //       .second {
  //           animation: swing2 1.2s linear infinite;
  //           transform-origin: center top;
  //       }</style><circle cx="8" cy="12" r="3" class="first"/><circle cx="16" cy="12" r="3"/><circle cx="24" cy="12" r="3"/><circle cx="32" cy="12" r="3" class="second"/></svg>`
  // },
];
