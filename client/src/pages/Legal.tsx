import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

const UPDATED = "6 de julio de 2026";

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  DATOS DEL TITULAR — COMPLETA ESTOS CAMPOS CON TU INFORMACIÓN REAL.
// El Aviso Legal (LSSI-CE) y la Política de Privacidad (RGPD) exigen datos veraces.
// ─────────────────────────────────────────────────────────────────────────────
const EMPRESA = {
  titular: "Rentrik, operado por BABYJOYCREATIONS LLC",
  idFiscal: "EIN 98-1753131",
  domicilio: "30 N Gould St Ste R, Sheridan, WY 82801, Estados Unidos",
  registro:
    "BABYJOYCREATIONS LLC — sociedad de responsabilidad limitada (LLC) constituida en el estado de Wyoming (Estados Unidos).",
  email: "rentrik.app@gmail.com",
  emailPrivacidad: "rentrik.app@gmail.com",
  emailLegal: "rentrik.app@gmail.com",
  web: "https://rentrik.app",
};

const LEGAL_LINKS = [
  { to: "/aviso-legal", label: "Aviso Legal" },
  { to: "/privacidad", label: "Política de Privacidad" },
  { to: "/cookies", label: "Política de Cookies" },
  { to: "/terminos", label: "Términos y Condiciones" },
];

function LegalLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
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
        {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
        <p className="mt-1 text-sm text-slate-400">Última actualización: {UPDATED}</p>
        <div className="prose-legal mt-8 space-y-7 text-[15px] leading-relaxed text-slate-600">{children}</div>
        <div className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-6 text-sm">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="font-medium text-brand hover:underline">{l.label}</Link>
          ))}
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

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 · AVISO LEGAL (LSSI-CE, art. 10)
// ─────────────────────────────────────────────────────────────────────────────
export function AvisoLegal() {
  return (
    <LegalLayout title="Aviso Legal" subtitle="Condiciones generales de uso del sitio web y del servicio Rentrik">
      <Section title="1. Datos identificativos del titular">
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y
          de Comercio Electrónico (LSSI-CE), se informa de que el titular de este sitio web y del servicio
          Rentrik (en adelante, "Rentrik") es:
        </p>
        <List
          items={[
            <><strong>Titular:</strong> {EMPRESA.titular}</>,
            <><strong>Identificación fiscal:</strong> {EMPRESA.idFiscal}</>,
            <><strong>Domicilio:</strong> {EMPRESA.domicilio}</>,
            <><strong>Correo electrónico:</strong> {EMPRESA.email}</>,
            <><strong>Sitio web:</strong> {EMPRESA.web}</>,
            <><strong>Forma jurídica:</strong> {EMPRESA.registro}</>,
          ]}
        />
      </Section>

      <Section title="2. Objeto">
        <p>
          El presente Aviso Legal regula el acceso, la navegación y el uso del sitio web y de la plataforma
          Rentrik, una herramienta de software como servicio (SaaS) para el análisis de rentabilidad de
          alquileres vacacionales. El acceso al sitio implica la aceptación sin reservas de este Aviso Legal.
        </p>
      </Section>

      <Section title="3. Condiciones de uso">
        <p>
          El usuario se compromete a hacer un uso lícito, diligente y de buena fe del sitio y del servicio,
          conforme a la ley, a la moral, al orden público y a las presentes condiciones. El usuario será
          responsable de la veracidad de los datos que facilite y de la custodia de sus credenciales de acceso.
          Queda prohibido cualquier uso que pueda dañar, inutilizar o sobrecargar el servicio, o impedir su
          normal utilización por otros usuarios.
        </p>
      </Section>

      <Section title="4. Propiedad intelectual e industrial">
        <p>
          Todos los contenidos del sitio y del servicio (textos, diseños, logotipos, la marca "Rentrik",
          código fuente, bases de datos, interfaces y demás elementos) son titularidad de Rentrik o de sus
          licenciantes y están protegidos por la normativa de propiedad intelectual e industrial. Queda
          prohibida su reproducción, distribución, comunicación pública o transformación sin autorización
          expresa. Los datos que el usuario introduce en la plataforma siguen siendo de su propiedad.
        </p>
      </Section>

      <Section title="5. Exclusión de responsabilidad">
        <p>
          Rentrik trabaja para mantener el servicio disponible y libre de errores, pero no garantiza la
          ausencia de interrupciones o fallos. Los cálculos e informes que ofrece la plataforma tienen
          carácter orientativo y no constituyen asesoramiento fiscal, contable, jurídico ni de inversión.
          Rentrik no se responsabiliza de las decisiones adoptadas por el usuario sobre la base de dicha
          información, ni de la exactitud de los datos importados de plataformas de terceros (OTAs).
        </p>
      </Section>

      <Section title="6. Enlaces a terceros">
        <p>
          El sitio puede contener enlaces a sitios de terceros. Rentrik no se responsabiliza de los
          contenidos ni de las políticas de privacidad de dichos sitios.
        </p>
      </Section>

      <Section title="7. Protección de datos">
        <p>
          El tratamiento de los datos personales se rige por la{" "}
          <Link to="/privacidad" className="text-brand hover:underline">Política de Privacidad</Link> y por la{" "}
          <Link to="/cookies" className="text-brand hover:underline">Política de Cookies</Link>.
        </p>
      </Section>

      <Section title="8. Legislación aplicable y jurisdicción">
        <p>
          Este Aviso Legal se rige por la legislación española. Para la resolución de cualquier controversia,
          las partes se someten a los Juzgados y Tribunales del domicilio del usuario cuando este sea
          consumidor; en los demás casos, a los del domicilio del titular, salvo que la normativa aplicable
          disponga otra cosa.
        </p>
      </Section>
    </LegalLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · POLÍTICA DE PRIVACIDAD (RGPD 2016/679 + LOPDGDD 3/2018)
// ─────────────────────────────────────────────────────────────────────────────
export function Privacidad() {
  return (
    <LegalLayout title="Política de Privacidad" subtitle="Cómo tratamos tus datos personales (RGPD y LOPDGDD)">
      <p>
        En Rentrik nos tomamos en serio la protección de tus datos. Esta política explica qué datos tratamos,
        con qué finalidad, durante cuánto tiempo y qué derechos tienes, conforme al Reglamento (UE) 2016/679
        (RGPD) y a la Ley Orgánica 3/2018 de Protección de Datos y garantía de los derechos digitales (LOPDGDD).
      </p>

      <Section title="1. Responsable del tratamiento">
        <List
          items={[
            <><strong>Responsable:</strong> {EMPRESA.titular}</>,
            <><strong>Identificación fiscal:</strong> {EMPRESA.idFiscal}</>,
            <><strong>Domicilio:</strong> {EMPRESA.domicilio}</>,
            <><strong>Contacto en materia de privacidad:</strong> {EMPRESA.emailPrivacidad}</>,
          ]}
        />
      </Section>

      <Section title="2. Qué datos recogemos">
        <List
          items={[
            <><strong>Datos de cuenta:</strong> nombre, correo electrónico, nombre de empresa y contraseña (almacenada cifrada).</>,
            <><strong>Datos de facturación:</strong> gestionados a través de Stripe; no almacenamos los datos completos de tu tarjeta.</>,
            <><strong>Datos de uso del servicio:</strong> propiedades, reservas, ingresos, gastos, incidencias y configuración que tú introduces.</>,
            <><strong>Datos de tus propietarios:</strong> nombre, email y teléfono que registres de terceros. Al facilitarlos, garantizas que estás legitimado para ello e informas a dichas personas de este tratamiento.</>,
            <><strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo y navegador, y registros de acceso, con fines de seguridad y funcionamiento.</>,
          ]}
        />
      </Section>

      <Section title="3. Finalidades y base jurídica">
        <List
          items={[
            <><strong>Prestar el servicio</strong> (crear tu cuenta, calcular la rentabilidad, generar informes): ejecución del contrato (art. 6.1.b RGPD).</>,
            <><strong>Gestionar la facturación y el cobro</strong> de las suscripciones: ejecución del contrato y cumplimiento de obligaciones legales, fiscales y contables (art. 6.1.b y 6.1.c).</>,
            <><strong>Enviarte comunicaciones sobre tu cuenta</strong> (bienvenida, avisos de fin de prueba, informes): ejecución del contrato e interés legítimo (art. 6.1.f).</>,
            <><strong>Garantizar la seguridad</strong> y prevenir el fraude: interés legítimo (art. 6.1.f).</>,
            <><strong>Enviar comunicaciones comerciales</strong>, en su caso: consentimiento (art. 6.1.a), revocable en cualquier momento.</>,
          ]}
        />
        <p>No tomamos decisiones automatizadas con efectos jurídicos ni elaboramos perfiles publicitarios.</p>
      </Section>

      <Section title="4. Plazo de conservación">
        <p>
          Conservamos tus datos mientras tu cuenta permanezca activa. Tras la baja, los conservaremos
          bloqueados durante los plazos legalmente exigibles (por ejemplo, obligaciones fiscales y mercantiles,
          generalmente hasta 6 años) y, transcurridos estos, procederemos a su supresión o anonimización.
        </p>
      </Section>

      <Section title="5. Destinatarios y encargados del tratamiento">
        <p>
          No vendemos tus datos. Los compartimos únicamente con proveedores necesarios para operar el servicio,
          que actúan como encargados del tratamiento con las debidas garantías contractuales:
        </p>
        <List
          items={[
            <><strong>Stripe</strong> — procesamiento de pagos.</>,
            <><strong>Proveedor de envío de correo (SMTP)</strong> — emails transaccionales.</>,
            <><strong>Proveedor de alojamiento (Railway)</strong> — infraestructura y base de datos.</>,
          ]}
        />
        <p>También podremos comunicar datos a las autoridades competentes cuando exista obligación legal.</p>
      </Section>

      <Section title="6. Transferencias internacionales">
        <p>
          Algunos de nuestros proveedores (por ejemplo, Stripe o el proveedor de alojamiento) pueden tratar
          datos fuera del Espacio Económico Europeo. En tal caso, dichas transferencias se amparan en
          garantías adecuadas conforme al RGPD, como las Cláusulas Contractuales Tipo aprobadas por la
          Comisión Europea o decisiones de adecuación aplicables.
        </p>
      </Section>

      <Section title="7. Tus derechos">
        <p>Puedes ejercer en cualquier momento los siguientes derechos:</p>
        <List
          items={[
            "Acceso a tus datos personales.",
            "Rectificación de datos inexactos.",
            "Supresión (derecho al olvido).",
            "Oposición al tratamiento.",
            "Limitación del tratamiento.",
            "Portabilidad de tus datos a otro responsable.",
            "Retirar el consentimiento prestado, sin efectos retroactivos.",
          ]}
        />
        <p>
          Para ejercerlos, escríbenos a <a href={`mailto:${EMPRESA.emailPrivacidad}`} className="text-brand hover:underline">{EMPRESA.emailPrivacidad}</a>,
          indicando el derecho que deseas ejercer. También puedes exportar tus datos desde la propia
          aplicación. Si consideras que no hemos atendido correctamente tu solicitud, tienes derecho a
          presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD, <a href="https://www.aepd.es" className="text-brand hover:underline" target="_blank" rel="noreferrer">www.aepd.es</a>).
        </p>
      </Section>

      <Section title="8. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas apropiadas para proteger tus datos: cifrado de
          contraseñas, conexiones seguras (HTTPS), control de acceso y copias de seguridad. Ningún sistema es
          completamente infalible, pero trabajamos de forma continua para mantener tu información protegida.
        </p>
      </Section>

      <Section title="9. Menores de edad">
        <p>
          Rentrik está dirigido a profesionales y particulares mayores de edad. No recogemos
          conscientemente datos de menores de 14 años.
        </p>
      </Section>

      <Section title="10. Cambios en esta política">
        <p>
          Podremos actualizar esta Política de Privacidad para adaptarla a novedades legales o a cambios en el
          servicio. Te informaremos de los cambios sustanciales por medios razonables. La fecha de la última
          actualización figura al inicio de este documento.
        </p>
      </Section>
    </LegalLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · POLÍTICA DE COOKIES
// ─────────────────────────────────────────────────────────────────────────────
export function Cookies() {
  return (
    <LegalLayout title="Política de Cookies" subtitle="Qué tecnologías de almacenamiento usa Rentrik y para qué">
      <Section title="1. Qué son las cookies y tecnologías similares">
        <p>
          Las cookies y tecnologías de almacenamiento local son pequeños ficheros que un sitio web guarda en
          tu dispositivo para recordar información. Pueden ser propias o de terceros, y de sesión o
          persistentes.
        </p>
      </Section>

      <Section title="2. Qué usa Rentrik">
        <p>
          Rentrik utiliza exclusivamente <strong>almacenamiento local técnico (localStorage)</strong>, estrictamente
          necesario para el funcionamiento del servicio. En concreto, guarda tu <em>token</em> de sesión
          (identificador `rentrik_token` y, en el portal del propietario, `rentrik_owner_token`) para
          mantener tu sesión iniciada mientras usas la aplicación.
        </p>
        <p>
          <strong>Rentrik NO utiliza cookies de análisis, seguimiento ni publicidad</strong>, ni elabora
          perfiles de navegación con fines comerciales.
        </p>
      </Section>

      <Section title="3. Cookies de terceros">
        <List
          items={[
            <><strong>Stripe</strong>: durante el proceso de pago, Stripe puede establecer cookies en su propio dominio para prevención del fraude y funcionamiento del pago. Estas cookies se rigen por la política de Stripe.</>,
            <><strong>Google Fonts</strong>: cargamos la tipografía Inter desde los servidores de Google; esta carga sirve archivos de fuente y no instala cookies de seguimiento en tu dispositivo.</>,
          ]}
        />
      </Section>

      <Section title="4. Base jurídica y consentimiento">
        <p>
          De acuerdo con el artículo 22.2 de la LSSI-CE, el almacenamiento técnico estrictamente necesario
          para prestar el servicio solicitado por el usuario <strong>está exento del deber de consentimiento</strong>.
          Como Rentrik no emplea cookies no exentas (análisis o publicidad), no se muestra un banner de
          consentimiento de cookies.
        </p>
      </Section>

      <Section title="5. Cómo gestionar o eliminar el almacenamiento">
        <p>
          Puedes borrar el almacenamiento local desde la configuración de tu navegador (opciones de
          privacidad → borrar datos de navegación / datos de sitios). Ten en cuenta que, si eliminas el
          almacenamiento técnico, se cerrará tu sesión y tendrás que volver a iniciarla.
        </p>
      </Section>

      <Section title="6. Cambios">
        <p>
          Si en el futuro incorporamos cookies no exentas, actualizaremos esta política e implementaremos el
          mecanismo de consentimiento que corresponda.
        </p>
      </Section>
    </LegalLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · TÉRMINOS Y CONDICIONES DE SERVICIO
// ─────────────────────────────────────────────────────────────────────────────
export function Terminos() {
  return (
    <LegalLayout title="Términos y Condiciones" subtitle="Contrato entre Rentrik y el usuario">
      <p>
        Estos Términos y Condiciones (en adelante, los "Términos") regulan la contratación y el uso del
        servicio Rentrik. Al registrarte o utilizar el servicio aceptas quedar vinculado por ellos. Si
        contratas en nombre de una empresa, declaras tener facultades para ello.
      </p>

      <Section title="1. Objeto y descripción del servicio">
        <p>
          Rentrik es una herramienta SaaS que permite a gestores y propietarios de alquiler vacacional
          importar sus ingresos de las plataformas (OTAs), registrar sus gastos y obtener el beneficio neto
          real de cada propiedad, así como generar informes en PDF. Rentrik no gestiona reservas ni
          comunicaciones con huéspedes, ni actúa como intermediario de las plataformas.
        </p>
      </Section>

      <Section title="2. Registro y cuenta">
        <p>
          Para usar el servicio debes crear una cuenta con información veraz y mantenerla actualizada. Eres
          responsable de la confidencialidad de tus credenciales y de toda actividad realizada bajo tu cuenta.
          Debes ser mayor de edad y tener capacidad legal para contratar.
        </p>
      </Section>

      <Section title="3. Planes y precios">
        <p>Rentrik ofrece los siguientes planes de suscripción mensual:</p>
        <List
          items={[
            <><strong>Starter</strong> — 15 €/mes · hasta 3 propiedades.</>,
            <><strong>Gestor</strong> — 79 €/mes · hasta 15 propiedades.</>,
            <><strong>Agencia</strong> — 189 €/mes · propiedades ilimitadas y marca propia.</>,
          ]}
        />
        <p>
          Los precios se muestran en la página de Precios. Salvo indicación en contrario, se expresan sin
          impuestos; se aplicarán los impuestos indirectos que correspondan (p. ej., IVA) según la normativa
          vigente y tu condición fiscal. Rentrik podrá modificar los precios notificándolo con antelación
          razonable; los cambios no afectarán al periodo ya facturado.
        </p>
      </Section>

      <Section title="4. Periodo de prueba gratuito">
        <p>
          Al contratar una suscripción, dispones de un periodo de prueba gratuito de 14 días antes de que se
          realice el primer cobro. Puedes cancelar durante ese periodo sin coste alguno. Transcurridos los 14
          días, se cobrará automáticamente la cuota del plan elegido, salvo que hayas cancelado con anterioridad.
        </p>
      </Section>

      <Section title="5. Facturación, renovación y pago">
        <p>
          Las suscripciones se facturan por adelantado y se renuevan automáticamente por periodos iguales,
          salvo cancelación. El pago se gestiona de forma segura a través de Stripe. Si un cobro es rechazado,
          podremos suspender el acceso hasta regularizar el pago.
        </p>
      </Section>

      <Section title="6. Cancelación">
        <p>
          Puedes cancelar tu suscripción en cualquier momento desde tu cuenta. La cancelación detiene la
          renovación futura; mantendrás el acceso hasta el final del periodo ya pagado. No hay permanencia
          mínima.
        </p>
      </Section>

      <Section title="7. Reembolsos y derecho de desistimiento">
        <p>
          Con carácter general, las cuotas ya abonadas no son reembolsables, salvo que la ley aplicable
          disponga otra cosa. Si eres consumidor en la Unión Europea, dispones de un derecho de desistimiento
          de 14 días naturales desde la contratación. No obstante, al tratarse de un servicio digital que
          comienza a prestarse de inmediato, si solicitas su ejecución antes de que finalice dicho plazo y
          aceptas expresamente la pérdida del derecho de desistimiento, este no será aplicable respecto de la
          parte del servicio ya prestada. El periodo de prueba gratuito te permite evaluar el servicio antes
          de pagar.
        </p>
      </Section>

      <Section title="8. Uso aceptable">
        <p>
          Te comprometes a no utilizar el servicio con fines ilícitos, a no intentar acceder a datos de otros
          usuarios, a no realizar ingeniería inversa, revender o sobrecargar la infraestructura, ni a
          introducir contenido que infrinja derechos de terceros.
        </p>
      </Section>

      <Section title="9. Tus datos y contenido">
        <p>
          Los datos que introduces (propiedades, ingresos, gastos, propietarios, incidencias) son de tu
          propiedad. Nos concedes una licencia limitada para tratarlos con el único fin de prestarte el
          servicio, conforme a la{" "}
          <Link to="/privacidad" className="text-brand hover:underline">Política de Privacidad</Link>. Puedes
          exportar tus datos y solicitar su eliminación en cualquier momento.
        </p>
      </Section>

      <Section title="10. Propiedad intelectual de Rentrik">
        <p>
          El software, la marca, el diseño y demás elementos de Rentrik son de su titularidad. La suscripción
          te otorga un derecho de uso limitado, no exclusivo e intransferible, mientras esté vigente.
        </p>
      </Section>

      <Section title="11. Limitación de responsabilidad">
        <p>
          Rentrik es una herramienta de apoyo a la gestión. Los informes y cálculos son orientativos y no
          constituyen asesoramiento fiscal, contable ni de inversión. No garantizamos la exactitud de los
          datos importados de terceros. En la medida permitida por la ley, Rentrik no será responsable de los
          daños indirectos o del lucro cesante derivados del uso del servicio. Nada en estos Términos excluye
          la responsabilidad que no pueda excluirse legalmente frente a consumidores.
        </p>
      </Section>

      <Section title="12. Disponibilidad y cambios del servicio">
        <p>
          Procuramos la máxima disponibilidad, pero el servicio puede sufrir interrupciones por mantenimiento
          o causas ajenas. Podremos modificar o discontinuar funcionalidades, informando de los cambios
          relevantes.
        </p>
      </Section>

      <Section title="13. Modificación de los Términos">
        <p>
          Podremos actualizar estos Términos notificándolo con antelación razonable. El uso continuado del
          servicio tras la entrada en vigor implica su aceptación. Si no estás de acuerdo, podrás cancelar.
        </p>
      </Section>

      <Section title="14. Legislación aplicable y resolución de conflictos">
        <p>
          Estos Términos se rigen por la legislación española y de la Unión Europea. Para consumidores, serán
          competentes los tribunales de su domicilio. Asimismo, la Comisión Europea ofrece una plataforma de
          resolución de litigios en línea (<a href="https://ec.europa.eu/consumers/odr" className="text-brand hover:underline" target="_blank" rel="noreferrer">ec.europa.eu/consumers/odr</a>).
        </p>
      </Section>

      <Section title="15. Contacto">
        <p>
          Para cualquier cuestión sobre estos Términos, escríbenos a{" "}
          <a href={`mailto:${EMPRESA.emailLegal}`} className="text-brand hover:underline">{EMPRESA.emailLegal}</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
