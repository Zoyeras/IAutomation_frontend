import React, { useState, useEffect, useCallback } from "react";

interface ClientData {
  nit: string;
  empresa: string;
  ciudad: string;
  cliente: string;
  celular: string;
  correo: string;
  tipoCliente: string;
  concepto: string;

  // Deben coincidir con el backend (.NET Registro)
  medioContacto: "WhatsApp" | "Correo" | "";
  asignadoA: string; // Enviamos el NOMBRE (ej: "LILIANA DEL PILAR") para que backend lo mapee a ID
  lineaVenta: "Venta" | "Mantenimiento" | "Servicio montacargas" | "Alquiler montacargas" | "";
}

const ASIGNADOS: { id: string; label: string }[] = [
  { id: "9", label: "LILIANA DEL PILAR" },
  { id: "40", label: "OSCAR FERNANDO" },
  { id: "34", label: "JOSE" },
  { id: "60", label: "JESSICA MARCELA" },
  { id: "78", label: "LAURA ALEJANDRA" },
  { id: "79", label: "GERALDINE" },
  { id: "80", label: "JOSE AUGUSTO" },
  { id: "81", label: "MARIA CAMILA" },
];

const detectLineaVenta = (conceptoRaw: string): ClientData["lineaVenta"] => {
  const c = (conceptoRaw || "").trim().toLowerCase();
  if (!c) return "";

  // Servicio / alquiler montacargas
  if (c.includes("montacarg")) {
    if (c.includes("alquiler")) return "Alquiler montacargas";
    return "Servicio montacargas";
  }

  // mantenimiento
  if (c.includes("mantenimiento") || c.includes("manten")) return "Mantenimiento";

  // venta
  if (c.includes("venta") || c.includes("vent")) return "Venta";

  return "";
};

type MinimalSpeechRecognitionResult = { transcript: string };
type MinimalSpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<MinimalSpeechRecognitionResult>>;
};
type MinimalSpeechRecognition = {
  lang: string;
  onstart: null | (() => void);
  onresult: null | ((event: MinimalSpeechRecognitionEvent) => void);
  onerror: null | (() => void);
  start: () => void;
};
type MinimalSpeechRecognitionCtor = new () => MinimalSpeechRecognition;

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const VoiceForm: React.FC = () => {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [lineaVentaManual, setLineaVentaManual] = useState(false);

  const [data, setData] = useState<ClientData>({
    nit: "",
    empresa: "",
    ciudad: "",
    cliente: "",
    celular: "",
    correo: "",
    tipoCliente: "",
    concepto: "",
    medioContacto: "",
    asignadoA: "",
    lineaVenta: "",
  });

  const fields: { key: keyof ClientData; label: string; prompt: string }[] = React.useMemo(
    () => [
      { key: "nit", label: "NIT", prompt: "Dime el NIT de la empresa" },
      { key: "empresa", label: "Nombre de Empresa", prompt: "¿Cuál es el nombre de la empresa?" },
      { key: "ciudad", label: "Ciudad", prompt: "¿En qué ciudad se encuentra?" },
      { key: "cliente", label: "Nombre del Cliente", prompt: "¿Cómo se llama el contacto?" },
      { key: "celular", label: "Celular", prompt: "Dime el número de celular" },
      { key: "correo", label: "Correo", prompt: "¿Cuál es el correo electrónico?" },
      { key: "tipoCliente", label: "Tipo de Cliente", prompt: "¿Es Nuevo, Antiguo, Fidelizado o Recuperado?" },
      { key: "concepto", label: "Concepto", prompt: "Dime el concepto de este registro" },
    ],
    []
  );

  const cleanInput = (key: keyof ClientData, value: string): string => {
    const clean = value.trim();

    const normalizeEmailSpeech = (raw: string) => {
      // Normaliza frases comunes dictadas a caracteres de email
      // Nota: esto es una heurística; siempre puede haber corrección manual.
      let s = raw.toLowerCase();

      // Primero quitamos espacios alrededor para evitar casos raros
      s = s.replace(/\s+/g, " ").trim();

      // Reemplazos multi-palabra primero
      s = s
        .replace(/guion\s*bajo/gi, "_")
        .replace(/sub\s*guion/gi, "_")
        .replace(/underscore/gi, "_")
        .replace(/guion\s*medio/gi, "-")
        .replace(/guion/gi, "-")
        .replace(/punto/gi, ".")
        .replace(/coma/gi, ".")
        .replace(/arroba/gi, "@")
        .replace(/espacio/gi, "");

      // Finalmente quitamos cualquier espacio que quede
      s = s.replace(/\s+/g, "");
      return s;
    };

    switch (key) {
      case "empresa":
      case "cliente":
      case "concepto":
        return clean.toUpperCase();

      case "celular":
        return clean.replace(/\s+/g, "");

      case "correo":
        return normalizeEmailSpeech(clean);

      case "tipoCliente": {
        const normalized = clean.toLowerCase();
        if (normalized.includes("nuevo")) return "Nuevo";
        if (normalized.includes("antiguo")) return "Antiguo";
        if (normalized.includes("fidelizado")) return "Fidelizado";
        if (normalized.includes("recuperado")) return "Recuperado";
        return clean;
      }

      default:
        return clean;
    }
  };

  const handleInputChange = useCallback(
    (key: keyof ClientData, value: string) => {
      let nextValue = value;

      // Permitir decir/escribir "nulo" para dejar el campo vacío (solo en campos permitidos)
      const allowNuloKeys: Array<keyof ClientData> = ["nit", "empresa", "cliente", "celular", "correo"];
      if (allowNuloKeys.includes(key)) {
        const normalized = String(nextValue).trim().toLowerCase();
        if (
          normalized === "nulo" ||
          normalized === "null" ||
          normalized === "ninguno" ||
          normalized === "na" ||
          normalized === "n/a"
        ) {
          nextValue = "";
        }
      }

      // Evitar palabras en campos numéricos
      if (key === "nit" || key === "celular") {
        nextValue = String(nextValue).replace(/\D+/g, "");
      }

      // Normalizar email también en entrada manual
      if (key === "correo") {
        nextValue = cleanInput("correo", nextValue);
      }

      setData((prev) => {
        const next = { ...prev, [key]: nextValue } as ClientData;

        if (key === "concepto" && !lineaVentaManual) {
          next.lineaVenta = detectLineaVenta(nextValue);
        }

        return next;
      });
    },
    [lineaVentaManual]
  );

  const syncHardware = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      window.speechSynthesis.getVoices();
      alert("Hardware listo.");
    } catch {
      alert("Error de hardware.");
    }
  };

  const speak = (text: string, callback?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";

    const safetyTimer = setTimeout(() => callback?.(), 3500);

    utterance.onend = () => {
      clearTimeout(safetyTimer);
      callback?.();
    };
    utterance.onerror = () => {
      clearTimeout(safetyTimer);
      callback?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = ((window as unknown as {
      webkitSpeechRecognition?: unknown;
      SpeechRecognition?: unknown;
    }).webkitSpeechRecognition || (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition) as
      | MinimalSpeechRecognitionCtor
      | undefined;

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-ES";
    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: MinimalSpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      const currentKey = fields[step].key;
      const processedValue = cleanInput(currentKey, transcript);

      // Reutilizamos la misma sanitización/normalización que en escritura manual
      handleInputChange(currentKey, processedValue);

      setIsListening(false);

      if (step < fields.length - 1) {
        setStep((s) => s + 1);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
  }, [step, fields, handleInputChange]);

  const validation = (() => {
    const errors: string[] = [];

    // Requeridos (según lo indicado): NIT, ciudad, tipoCliente y concepto
    if (!data.nit) errors.push("NIT es obligatorio");
    if (!data.ciudad) errors.push("Ciudad es obligatoria");
    if (!data.tipoCliente) errors.push("Tipo de cliente es obligatorio");
    if (!data.concepto) errors.push("Concepto es obligatorio");

    // Estos siguen siendo requeridos para el flujo de asignación/CRM
    if (!data.asignadoA) errors.push("Selecciona a quién queda asignado");
    if (!data.lineaVenta) errors.push("Selecciona la línea de venta");

    // Medio de contacto NO es obligatorio, pero si lo eligen validamos consistencia
    if (data.medioContacto === "Correo") {
      if (!data.correo || !isValidEmail(data.correo)) errors.push("Correo inválido para medio Correo");
    }

    if (data.medioContacto === "WhatsApp") {
      if (!data.celular) errors.push("Celular requerido para medio WhatsApp");
    }

    return { ok: errors.length === 0, errors };
  })();

  const guardarEnBackend = async () => {
    try {
      const response = await fetch("http://localhost:5016/api/Registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) alert("¡Guardado en Postgres!");
      else alert("No se pudo guardar. Revisa el backend.");
    } catch {
      alert("Error de conexión.");
    }
  };

  useEffect(() => {
    if (started && step < fields.length) {
      const timer = setTimeout(() => {
        speak(fields[step].prompt, () => {
          setTimeout(startListening, 600);
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [step, started, startListening, fields]);

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white gap-6 px-6 text-black">
        <img
          src="/logo_hidraulicos.webp"
          alt="Logo"
          className="w-64 max-w-full object-contain"
        />

        <button onClick={syncHardware} className="text-black underline text-sm font-semibold">
          Sincronizar
        </button>

        <button
          className="bg-[#cf1313] hover:bg-[#b90f0f] text-white px-10 py-5 rounded-xl font-black text-2xl shadow-lg transition-colors"
          onClick={() => setStarted(true)}
        >
          INICIAR
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 bg-white border border-slate-200 rounded-2xl text-black shadow-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-[9px] border-b-2 border-[#e0e0e0] bg-[#cf1313]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="m-0 text-[20px] font-black tracking-tight text-white/90">Captura</h2>
            <p className="mt-1 text-sm text-white/70">Completa los datos y guarda en el sistema.</p>
          </div>

          <div className="shrink-0">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black border ${
                isListening
                  ? "bg-white text-[#cf1313] border-white"
                  : "bg-[#cf1313] text-white/90 border-white/40"
              }`}
              title={isListening ? "Micrófono escuchando" : "Micrófono en espera"}
            >
              {isListening ? "ESCUCHANDO" : "LISTO"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isListening && (
          <div className="mb-3 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            Escuchando...
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map((f, index) => (
            <div
              key={f.key}
              className={`p-3 rounded-xl transition-all cursor-pointer ${
                step === index
                  ? "bg-red-50 border-2 border-[#cf1313]"
                  : "bg-white border border-slate-200"
              }`}
              onClick={() => setStep(index)}
            >
              <label className="text-[10px] text-black font-black uppercase">{f.label}</label>
              <input
                type="text"
                className="w-full mt-1 bg-transparent border-0 outline-none text-base font-semibold text-black"
                style={{
                  textTransform:
                    f.key === "empresa" || f.key === "cliente" || f.key === "concepto" ? "uppercase" : "none",
                }}
                value={data[f.key] as string}
                onChange={(e) => handleInputChange(f.key, e.target.value)}
                placeholder="..."
              />
              {step === index && <div className="mt-2 h-0.5 bg-[#cf1313]/80 rounded" />}
            </div>
          ))}
        </div>

        {/* Campos destino */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white border border-slate-200">
            <label className="text-[10px] text-black font-black uppercase">Medio de contacto</label>
            <select
              className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none text-sm focus:border-[#cf1313] focus:ring-2 focus:ring-[#cf1313]/20"
              value={data.medioContacto}
              onChange={(e) => handleInputChange("medioContacto", e.target.value as ClientData["medioContacto"])}
              required
            >
              <option value="">Seleccionar...</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Correo">Correo</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200">
            <label className="text-[10px] text-black font-black uppercase">Asignado a</label>
            <select
              className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none text-sm focus:border-[#cf1313] focus:ring-2 focus:ring-[#cf1313]/20"
              value={data.asignadoA}
              onChange={(e) => handleInputChange("asignadoA", e.target.value)}
              required
            >
              <option value="">Seleccionar...</option>
              {ASIGNADOS.map((a) => (
                <option key={a.id} value={a.label}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <label className="text-[10px] text-black font-black uppercase">Línea de venta</label>
              <button
                type="button"
                className="text-xs text-[#cf1313] underline font-semibold"
                onClick={() => {
                  setLineaVentaManual(false);
                  setData((prev) => ({ ...prev, lineaVenta: detectLineaVenta(prev.concepto) }));
                }}
                title="Recalcular desde Concepto"
              >
                Auto
              </button>
            </div>

            <select
              className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none text-sm focus:border-[#cf1313] focus:ring-2 focus:ring-[#cf1313]/20"
              value={data.lineaVenta}
              onChange={(e) => {
                setLineaVentaManual(true);
                handleInputChange("lineaVenta", e.target.value as ClientData["lineaVenta"]);
              }}
              required
            >
              <option value="">Seleccionar...</option>
              <option value="Venta">Venta</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Servicio montacargas">Servicio montacargas</option>
              <option value="Alquiler montacargas">Alquiler montacargas</option>
            </select>

            <p className="mt-2 text-[11px] text-black">
              Sugerencia: <span className="font-semibold">{detectLineaVenta(data.concepto) || "(sin detectar)"}</span>
              {lineaVentaManual ? " · manual" : " · auto"}
            </p>
          </div>
        </div>

        {!validation.ok && (
          <div className="mt-4 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
            <div className="font-black uppercase text-xs mb-2 text-red-800">Faltan datos</div>
            <ul className="list-disc pl-5 space-y-1">
              {validation.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          className={`w-full mt-5 py-3 rounded-xl font-black text-lg shadow-lg transition-colors ${
            validation.ok ? "bg-[#cf1313] hover:bg-[#b90f0f] text-white" : "bg-slate-200 text-black/70 cursor-not-allowed"
          }`}
          onClick={guardarEnBackend}
          disabled={!validation.ok}
        >
          GUARDAR EN SISTEMA
        </button>
      </div>
    </div>
  );
};

export default VoiceForm;
