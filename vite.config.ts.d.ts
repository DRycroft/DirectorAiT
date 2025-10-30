// Image optimization types for Vite
declare module '*?format=webp' {
  const src: string;
  export default src;
}

declare module '*?w=*&h=*' {
  const src: string;
  export default src;
}
