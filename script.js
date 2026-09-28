const AVOGADRO = 6.02214076e23;

let elements = {};

fetch("elements.json")
  .then(response => response.json())
  .then(data => {
    elements = data;

    fillSelect(mvElement, false); // todos los elementos
    fillSelect(thElement, true);  // solo cúbicos
  })
  .catch(error => {
    console.error("Error cargando JSON:", error);
  });

const latticeNames = {
  P: "Cúbica simple (P)",
  I: "Cúbica centrada en el cuerpo (I)",
  F: "Cúbica centrada en las caras (F)",
};

const form = document.getElementById("densityForm");
const mvElement = document.getElementById("mvElement");
const thElement = document.getElementById("thElement");
const massInput = document.getElementById("mass");
const volumeInput = document.getElementById("volume");
const aValue = document.getElementById("aValue");
const rValue = document.getElementById("rValue");
const cellVolume = document.getElementById("cellVolume");
const volumeUnit = document.getElementById("volumeUnit");
const latticeType = document.getElementById("latticeType");
const atomsPerCell = document.getElementById("atomsPerCell");
const atomicWeight = document.getElementById("atomicWeight");
const output = document.getElementById("output");
const calcBtn = document.getElementById("calcBtn");
const mvFields = document.getElementById("mvFields");
const theoryFields = document.getElementById("theoryFields");
const leftTitle = document.getElementById("leftTitle");
const modeButtons = document.querySelectorAll(".mode-btn");

let mode = "mv";

function fillSelect(select, onlyCubic = false) {
  select.innerHTML = '<option value="">-- Selecciona --</option>';

  Object.entries(elements).forEach(([symbol, data]) => {

    if (onlyCubic && !data.lattice) return;

    const option = document.createElement("option");
    option.value = symbol;
    option.textContent = `${symbol} - ${data.name}`;
    select.appendChild(option);
  });
}

fillSelect(mvElement);
fillSelect(thElement);

function setMode(newMode) {
  mode = newMode;
  modeButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.mode === newMode));

  if (newMode === "mv") {
    mvFields.classList.remove("hidden");
    theoryFields.classList.add("hidden");
    leftTitle.textContent = "Datos";
  } else {
    mvFields.classList.add("hidden");
    theoryFields.classList.remove("hidden");
    leftTitle.textContent = "Datos";
  }

  output.innerHTML = "<p>Selecciona un modo y presiona <strong>Calcular</strong>.</p>";
}

modeButtons.forEach(btn => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

function getSelectedElement(select) {
  return elements[select.value] || null;
}

function updateTheoryInfo() {
  const el = getSelectedElement(thElement);
  if (!el) {
    latticeType.textContent = "-";
    atomsPerCell.textContent = "-";
    atomicWeight.textContent = "-";
    return;
  }

  latticeType.textContent = latticeNames[el.lattice];
  atomsPerCell.textContent = el.atomsPerCell;
  atomicWeight.textContent = `${el.atomicWeight} g/mol`;
}

function autoFillValues() {
  const el = getSelectedElement(thElement);
  if (!el || !el.a) return;

  // rellenar A
  aValue.value = el.a;

  // calcular radio según red
  let r;

  if (el.lattice === "P") {
    r = el.a / 2;
  } else if (el.lattice === "I") {
    r = (Math.sqrt(3) * el.a) / 4;
  } else if (el.lattice === "F") {
    r = el.a / (2 * Math.sqrt(2));
  }

  rValue.value = r.toFixed(4);
}

thElement.addEventListener("change", () => {
  updateTheoryInfo();
  autoFillValues();
});

function updateInputTypeFields() {
  const type = getInputType();
  document.getElementById("aGroup").classList.toggle("hidden", type !== "a");
  document.getElementById("rGroup").classList.toggle("hidden", type !== "r");
  document.getElementById("vGroup").classList.toggle("hidden", type !== "v");
}

document.querySelectorAll('input[name="inputType"]').forEach(radio => {
  radio.addEventListener("change", updateInputTypeFields);
});

function getInputType() {
  return document.querySelector('input[name="inputType"]:checked').value;
}

function latticeToA(r, lattice) {
  if (lattice === "P") return 2 * r;
  if (lattice === "I") return (4 * r) / Math.sqrt(3);
  if (lattice === "F") return 2 * Math.sqrt(2) * r;
  throw new Error("Tipo de red no soportado.");
}

function angstromToCm(value) {
  return value * 1e-8;
}

function angstromCubedToCm3(value) {
  return value * 1e-24;
}

function renderResult(html) {
  output.innerHTML = html;
}

function calcMV() {
  const el = getSelectedElement(mvElement);
  const mass = parseFloat(massInput.value);
  const volume = parseFloat(volumeInput.value);

  if (!el) {
    renderResult("<p>Elige un elemento.</p>");
    return;
  }

  if (!(mass > 0) || !(volume > 0)) {
    renderResult("<p>Escribe una masa y un volumen válidos, mayores que 0.</p>");
    return;
  }

  const density = mass / volume;

  renderResult(`
    <p><strong>Elemento:</strong> ${el.name} (${mvElement.value})</p>
    <p><strong>Masa:</strong> ${mass} g</p>
    <p><strong>Volumen:</strong> ${volume} cm³</p>
    <div class="result">
      <p><strong>Densidad:</strong> ${density.toFixed(4)} g/cm³</p>
      <p>Fórmula: ρ = m / V</p>
    </div>
  `);
}

function calcTheory() {
  const el = getSelectedElement(thElement);
  if (!el) {
    renderResult("<p>Elige un elemento.</p>");
    return;
  }

  if (!el.lattice) {
    renderResult("<p>Este elemento no tiene estructura cúbica soportada.</p>");
    return;
  }

  const type = getInputType();
  let aCm = null;
  let volumeCm3 = null;
  let detailLine = "";

  if (type === "a") {
    const a = parseFloat(aValue.value);
    if (!(a > 0)) {
      renderResult("<p>Escribe un parámetro reticular válido.</p>");
      return;
    }
    aCm = angstromToCm(a);
    volumeCm3 = aCm ** 3;
    detailLine = `<p><strong>Parámetro reticular:</strong> ${a} Å</p>`;
  } else if (type === "r") {
    const r = parseFloat(rValue.value);
    if (!(r > 0)) {
      renderResult("<p>Escribe un radio atómico válido.</p>");
      return;
    }
    const a = latticeToA(r, el.lattice);
    aCm = angstromToCm(a);
    volumeCm3 = aCm ** 3;
    detailLine = `
      <p><strong>Radio atómico:</strong> ${r} Å</p>
      <p><strong>a calculada:</strong> ${a.toFixed(4)} Å</p>
    `;
  } else {
    const v = parseFloat(cellVolume.value);
    if (!(v > 0)) {
      renderResult("<p>Escribe un volumen válido.</p>");
      return;
    }
    volumeCm3 = volumeUnit.value === "angstrom3" ? angstromCubedToCm3(v) : v;
    detailLine = `
      <p><strong>Volumen de celda:</strong> ${v} ${volumeUnit.value === "angstrom3" ? "Å³" : "cm³"}</p>
    `;
  }

  const massCell = (el.atomsPerCell * el.atomicWeight) / AVOGADRO;
  const density = massCell / volumeCm3;

  renderResult(`
    <p><strong>Elemento:</strong> ${el.name} (${thElement.value})</p>
    <p><strong>Tipo de celda:</strong> ${latticeNames[el.lattice]}</p>
    <p><strong># átomos/celda:</strong> ${el.atomsPerCell}</p>
    <p><strong>Peso atómico:</strong> ${el.atomicWeight} g/mol</p>
    ${detailLine}
    <div class="result">
      <p><strong>Masa de la celda:</strong> ${massCell.toExponential(4)} g</p>
      <p><strong>Volumen de la celda:</strong> ${volumeCm3.toExponential(4)} cm³</p>
      <p><strong>Densidad teórica:</strong> ${density.toFixed(4)} g/cm³</p>
    </div>
  `);
}

calcBtn.addEventListener("click", () => {
  if (mode === "mv") calcMV();
  else calcTheory();
});

setMode("mv");
updateTheoryInfo();
