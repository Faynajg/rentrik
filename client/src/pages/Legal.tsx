import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

const UPDATED = "5 de julio de 2026";

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="section flex items-center justify-between py-4">
          <Link to="/"><Logo size={28} /></Link>
          <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-brand">Volver al inicio</Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">Última actualización: {UPDATED}</p>
        <div className="prose-legal mt-8 space-y-6 text-[15px] leading-relaxed text-slate-600">{children}</div>
        <div className="mt-12 flex gap-4 border-t border-slate-100 pt-6 text-sm">
          <Link to="/terminos" className="font-medium text-brand hover:underline">Términos y Condiciones</Link>
          <Link to="/privacidad" className="font-medium text-brand hover:underline">Política de Privacidad</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Terminos() {
  return (
    <LegalLayout title="Términos y Condiciones">
      <p>
        Bienvenido a Rentrik. Estos Términos y Condiciones regulan el acceso y uso de la plataforma
        Rentrik (en adelante, "el Servicio"). Al registrarte o utilizar el Servicio, aceptas quedar
        vinculado por estos términos.
      </p>
      <Section title="1. Descripción del servicio">
        <p>
          Rentrik es una herramienta de análisis de rentabilidad para gestores y propietarios de
          alquiler vacacional. Permite importar ingresos de plataformas (OTAs), registrar gastos y
          generar informes de rentabilidad en PDF. Rentrik no gestiona reservas, cobros a huéspedes ni
          actúa como intermediario de las plataformas.
      </p>
      </Section>
      <Section title="2. Registro y cuenta">
        <p>
          Debes proporcionar información veraz y mantener la confidencialidad de tus credenciales. Eres
          responsable de toda actividad realizada bajo tu cuenta. Debes ser mayor de edad y tener
          capacidad legal para contratar.
        </p>
      </Section>
      <Section title="3. Periodo de prueba y suscripción">
        <p>
          Rentrik ofrece un periodo de prueba gratuito de 14 días, sin necesidad de tarjeta de crédito.
          Transcurrido el periodo, para seguir usando el Servicio deberás contratar uno de los planes
          disponibles. Los precios se muestran en la página de Precios e incluyen los impuestos aplicables
          cuando corresponda. Puedes cancelar la suscripción en cualquier momento; el acceso se mantendrá
          hasta el final del periodo ya facturado.
        </p>
      </Section>
      <Section title="4. Uso aceptable">
        <p>
          Te comprometes a no utilizar el Servicio con fines ilícitos, a no intentar acceder a datos de
          otros usuarios, ni a realizar ingeniería inversa, revender o sobrecargar la infraestructura del
          Servicio.
        </p>
      </Section>
      <Section title="5. Datos y contenido del usuario">
        <p>
          Los datos que introduces (propiedades, ingresos, gastos, propietarios) son de tu propiedad.
          Rentrik los trata conforme a la <Link to="/privacidad" className="text-brand hover:underline">Política de Privacidad</Link>.
          Puedes exportar tus datos y solicitar su eliminación en cualquier momento.
        </p>
      </Section>
      <Section title="6. Limitación de responsabilidad">
        <p>
          Rentrik es una herramienta de apoyo a la gestión. Los informes y cálculos son orientativos y no
          constituyen asesoramiento fiscal, contable ni de inversión. No garantizamos la exactitud de los
          datos importados de terceros. En la medida permitida por la ley, Rentrik no será responsable de
          decisiones tomadas en base a la información mostrada.
        </p>
      </Section>
      <Section title="7. Modificaciones y ley aplicable">
        <p>
          Podemos actualizar estos términos notificándolo con antelación razonable. El uso continuado
          implica la aceptación de los cambios. Estos términos se rigen por la legislación española y de
          la Unión Europea, sometiéndose las partes a los tribunales competentes.
        </p>
      </Section>
      <Section title="8. Contacto">
        <p>Para cualquier consulta sobre estos términos, escríbenos a <a href="mailto:legal@rentrik.com" className="text-brand hover:underline">legal@rentrik.com</a>.</p>
      </Section>
    </LegalLayout>
  );
}

export function Privacidad() {
  return (
    <LegalLayout title="Política de Privacidad">
      <p>
        En Rentrik nos tomamos en serio tu privacidad. Esta política explica cómo tratamos tus datos
        personales conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).
      </p>
      <Section title="1. Responsable del tratamiento">
        <p>
          El responsable del tratamiento de tus datos es Rentrik. Puedes contactar con nosotros en
          <a href="mailto:privacidad@rentrik.com" className="text-brand hover:underline"> privacidad@rentrik.com</a> para
          cualquier cuestión relacionada con tus datos personales.
        </p>
      </Section>
      <Section title="2. Datos que tratamos">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Datos de cuenta:</strong> nombre, email, nombre de empresa y contraseña (cifrada).</li>
          <li><strong>Datos de facturación:</strong> gestionados a través de Stripe; no almacenamos los datos completos de tu tarjeta.</li>
          <li><strong>Datos de uso:</strong> propiedades, ingresos, gastos y propietarios que tú introduces.</li>
          <li><strong>Datos de propietarios:</strong> nombre, email y teléfono que registres de tus propietarios.</li>
        </ul>
      </Section>
      <Section title="3. Finalidad y base jurídica">
        <p>
          Tratamos tus datos para prestarte el Servicio (ejecución del contrato), gestionar la facturación
          (obligación contractual y legal), enviarte comunicaciones sobre tu cuenta y prueba (interés
          legítimo) y cumplir obligaciones legales. No utilizamos tus datos para elaborar perfiles
          publicitarios ni los vendemos a terceros.
        </p>
      </Section>
      <Section title="4. Comunicación de datos y encargados">
        <p>
          Compartimos datos únicamente con proveedores necesarios para operar el Servicio, que actúan como
          encargados del tratamiento: pasarela de pago (Stripe), proveedor de envío de correo y proveedor
          de alojamiento. Todos ellos ofrecen garantías adecuadas conforme al RGPD.
        </p>
      </Section>
      <Section title="5. Conservación">
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Si cancelas, los conservaremos durante el
          plazo legal necesario (por ejemplo, obligaciones fiscales) y después los eliminaremos o
          anonimizaremos.
        </p>
      </Section>
      <Section title="6. Tus derechos">
        <p>
          Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión, oposición,
          limitación y portabilidad de tus datos, escribiéndonos a
          <a href="mailto:privacidad@rentrik.com" className="text-brand hover:underline"> privacidad@rentrik.com</a>.
          También puedes exportar tus datos desde la propia aplicación y presentar una reclamación ante la
          Agencia Española de Protección de Datos (www.aepd.es) si consideras que no hemos atendido tu
          solicitud.
        </p>
      </Section>
      <Section title="7. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas para proteger tus datos: cifrado de contraseñas,
          conexiones seguras y control de acceso. Ningún sistema es infalible, pero trabajamos para
          mantener tu información protegida.
        </p>
      </Section>
      <Section title="8. Cookies">
        <p>
          Rentrik utiliza únicamente cookies y almacenamiento local técnicos, necesarios para mantener tu
          sesión iniciada. No usamos cookies de seguimiento publicitario.
        </p>
      </Section>
    </LegalLayout>
  );
}
