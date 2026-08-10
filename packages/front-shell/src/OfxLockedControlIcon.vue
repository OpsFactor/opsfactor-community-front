<template>
  <!--
    Shared semantic glyph for controls that preserve an effective value while
    preventing interaction. Edition availability remains owned by
    OfxEditionAvailabilityMark in the label; this glyph communicates the
    non-interactive state inside the control itself.
  -->
  <svg
    viewBox="0 0 20 20"
    fill="none"
    class="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <rect x="4.25" y="8.25" width="11.5" height="8" rx="2" stroke="currentColor" stroke-width="1.5" />
    <path d="M6.75 8.25V6.5a3.25 3.25 0 0 1 6.5 0v1.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
