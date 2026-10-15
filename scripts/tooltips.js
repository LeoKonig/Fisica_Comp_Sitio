document.addEventListener("DOMContentLoaded", function () {
    tippy('.tip', {
      theme: 'light',
      animation: 'scale',
      arrow: true,
      interactive: true,
      allowHTML: true,
      maxWidth: 350,
      onShown(instance) {
        if (window.MathJax?.typesetPromise) {
          MathJax.typesetPromise([instance.popper]);
        }
      }
    });
  });