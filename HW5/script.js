/**
 * script.js
 * Wires the UI: reads the shared array input, runs the algorithm
 * matching the clicked button (via data-algorithm), and fills in
 * that algorithm's own output field and stats. Reset clears all
 * three results without touching the input.
 */

document.addEventListener('DOMContentLoaded', function () {
  const arrayInput = document.getElementById('arrayInput');
  const inputError = document.getElementById('inputError');
  const resetBtn = document.getElementById('resetBtn');
  const sortButtons = document.querySelectorAll('.sort-btn');

  const algorithms = {
    bubble: bubbleSort,
    selection: selectionSort,
    quick: quickSort
  };

  function parseArray(rawValue) {
    const parts = rawValue.split(/[\s,]+/).filter(function (p) { return p.length > 0; });
    const numbers = parts.map(Number);
    const allValid = numbers.length >= 2 && numbers.every(function (n) { return !isNaN(n); });
    return allValid ? numbers : null;
  }

  function formatTime(ms) {
    if (ms < 0.01) return '< 0.01 ms';
    return ms.toFixed(3) + ' ms';
  }

  function fillResult(algorithmKey, result) {
    document.getElementById(algorithmKey + 'Output').value = result.sorted.join(', ');
    document.getElementById(algorithmKey + 'Comparisons').textContent = result.comparisons;
    document.getElementById(algorithmKey + 'Swaps').textContent = result.swaps;
    document.getElementById(algorithmKey + 'Time').textContent = formatTime(result.timeMs);
  }

  function clearResult(algorithmKey) {
    document.getElementById(algorithmKey + 'Output').value = '';
    document.getElementById(algorithmKey + 'Comparisons').textContent = '\u2014';
    document.getElementById(algorithmKey + 'Swaps').textContent = '\u2014';
    document.getElementById(algorithmKey + 'Time').textContent = '\u2014';
  }

  sortButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const algorithmKey = button.getAttribute('data-algorithm');
      const numbers = parseArray(arrayInput.value);

      if (!numbers) {
        inputError.classList.remove('d-none');
        return;
      }
      inputError.classList.add('d-none');

      const sortFn = algorithms[algorithmKey];
      const result = sortFn(numbers);
      fillResult(algorithmKey, result);
    });
  });

  resetBtn.addEventListener('click', function () {
    inputError.classList.add('d-none');
    Object.keys(algorithms).forEach(clearResult);
  });
});
