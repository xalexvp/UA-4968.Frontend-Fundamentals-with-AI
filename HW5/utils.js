/**
 * utils.js
 * Three classic sorting algorithms, each instrumented to report
 * comparisons, swaps, and execution time — so they can be compared
 * side by side in the UI.
 *
 * Every function has the same signature and return shape:
 *   sortFn(array: number[]) => {
 *     sorted: number[],
 *     comparisons: number,
 *     swaps: number,
 *     timeMs: number
 *   }
 */

function bubbleSort(inputArray) {
  const arr = [...inputArray];
  let comparisons = 0;
  let swaps = 0;

  const start = performance.now();

  for (let i = 0; i < arr.length - 1; i++) {
    let swappedInPass = false;
    for (let j = 0; j < arr.length - 1 - i; j++) {
      comparisons++;
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swaps++;
        swappedInPass = true;
      }
    }
    if (!swappedInPass) break;
  }

  const timeMs = performance.now() - start;

  return { sorted: arr, comparisons, swaps, timeMs };
}

function selectionSort(inputArray) {
  const arr = [...inputArray];
  let comparisons = 0;
  let swaps = 0;

  const start = performance.now();

  for (let i = 0; i < arr.length - 1; i++) {
    let minIndex = i;
    for (let j = i + 1; j < arr.length; j++) {
      comparisons++;
      if (arr[j] < arr[minIndex]) {
        minIndex = j;
      }
    }
    if (minIndex !== i) {
      [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
      swaps++;
    }
  }

  const timeMs = performance.now() - start;

  return { sorted: arr, comparisons, swaps, timeMs };
}

function quickSort(inputArray) {
  const arr = [...inputArray];
  let comparisons = 0;
  let swaps = 0;

  const start = performance.now();

  function partition(low, high) {
    const pivot = arr[high];
    let i = low - 1;

    for (let j = low; j < high; j++) {
      comparisons++;
      if (arr[j] < pivot) {
        i++;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        swaps++;
      }
    }

    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    swaps++;
    return i + 1;
  }

  function quickSortRecursive(low, high) {
    if (low < high) {
      const pivotIndex = partition(low, high);
      quickSortRecursive(low, pivotIndex - 1);
      quickSortRecursive(pivotIndex + 1, high);
    }
  }

  if (arr.length > 1) {
    quickSortRecursive(0, arr.length - 1);
  }

  const timeMs = performance.now() - start;

  return { sorted: arr, comparisons, swaps, timeMs };
}
