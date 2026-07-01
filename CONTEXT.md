# Team Pollito Comunidad

Portal unificado para la gestión de la comunidad de Team Pollito, la administración de entrevistas y la interacción en vivo con el stream mediante alertas, sonidos y lectura de voz (TTS).

## Language

**Miembro Oficial (Official Member)**:
Usuario que vinculó sus cuentas de Roblox y TikTok, aceptó las reglas y fue aprobado manualmente en el sistema por el Administrador.
_Avoid_: Miembro verificado, Votante, Usuario común

**Candidato (Candidate / Pollito)**:
Usuario que se postuló al Team Pollito y está esperando o agendando su entrevista 1:1.
_Avoid_: Postulante, Aspirante, Candidato a desbaneo

**Entrevista (Interview)**:
Conversación 1:1 sincrónica entre el Streamer (Milumon) y un Candidato para evaluar su ingreso a la comunidad. Se realiza exclusivamente los viernes y puede tener estados como Pendiente o Reprogramada.
_Avoid_: Charla, Reunión, Examen

**Horario (Slot)**:
Bloque de fecha y hora disponible para reservar una Entrevista. Solo se pueden definir en días viernes.
_Avoid_: Turno, Cita, Espacio

**Overlay**:
Página web oculta cargada como fuente de navegador en OBS o TikTok Live Studio que reproduce sonidos y animaciones en vivo.
_Avoid_: Interfaz de transmisión, Alerta de OBS, Widget

**Evento de Stream (Stream Event)**:
Acción interactiva (sonidos, animaciones, TTS) disparada por un Miembro Oficial desde la web que se reproduce en el Overlay.
_Avoid_: Alerta, Notificación, Trigger

**Text-To-Speech (TTS)**:
Servicio de conversión de texto a voz generado mediante la API de Google Cloud TTS e integrado en el Overlay.
_Avoid_: Lector de voz, Voz sintética, Audio de texto

**Panel de Control (Dashboard / Admin Panel)**:
Panel exclusivo para administradores autorizados para gestionar Horarios, Candidatos, Miembros y configurar los límites de transmisión.
_Avoid_: Admin dashboard, Consola de control

**Administrador (Admin / Owner)**:
Usuario con permisos elevados para gestionar la plataforma. El creador principal (Owner) con email kpopxfull@gmail.com posee acceso absoluto inmutable. Los administradores pueden delegar o revocar el rol de administrador a otros Miembros Oficiales desde el Panel de Control.
_Avoid_: Moderador, Staff, Encargado

**Lienzo 9:16 (9:16 Canvas / Vertical Overlay)**:
Proporción vertical del Overlay de OBS Studio diseñada específicamente para transmisiones en TikTok Live y Shorts. Restringe los eventos de animación y alertas al formato vertical del stream.
_Avoid_: Overlay de OBS, Pantalla completa, Widget horizontal

**Testimonio (Testimonial)**:
Opinión opcional enviada por un usuario al finalizar su vinculación de cuentas (onboarding web), sujeta a moderación del administrador para mostrarse en la landing page.
_Avoid_: Reseña, Comentario libre, Crítica

**Registro de Auditoría (Admin Audit Log)**:
Historial guardado en la base de datos que registra toda acción destructiva o de modificación de los administradores en el panel para auditoría y visualización de la actividad en vivo.
_Avoid_: Log del sistema, Historial de visitas, Entrada de consola

**ADN de Diseño / Sistema de Diseño (Design DNA / Design System)**:
Conjunto unificado de directrices visuales basadas en el estilo Neobrutalismo Oscuro Unificado (tipografía Anton/Inter, color amarillo #FFD500, bordes de 3px y sombras duras amarillas en modo oscuro y negras en modo claro).
_Avoid_: Estilo SaaS, UI gamer, Tema Discord

**Envío de Audio (Audio Submission)**:
Audio subido por un Miembro Oficial desde la consola, sujeto a revisión de un Administrador antes de ser disponibilizado como Sonido Público o Sonido Privado. Mientras está en revisión, solo el Miembro que lo envió puede verlo en su historial de envíos.
_Avoid_: Propuesta de sonido, Audio pendiente, Upload de usuario

**Sonido Privado (Private Sound)**:
Sonido aprobado por un Administrador cuyo botón de disparo solo aparece en la consola del Miembro Oficial que lo envió. El Overlay lo reproduce sin distinción respecto a los sonidos públicos.
_Avoid_: Sonido exclusivo, Audio personal, Sonido de usuario

**Sonido Público (Public Sound)**:
Sonido aprobado por un Administrador que aparece en la botonera compartida y puede ser disparado por todos los Miembros Oficiales. Equivalente al comportamiento original de `soundboard_sounds`.
_Avoid_: Sonido global, Audio comunitario, Sonido del admin

**Protección Anti-Spam (Anti-Spam Guard)**:
Mecanismo de seguridad opcional en la Consola del Miembro que solicita confirmación en pantalla antes de disparar sonidos o efectos para evitar clics accidentales. Puede ser deshabilitado por el usuario en el propio diálogo de confirmación o en el panel de Ajustes.
_Avoid_: Diálogo molesto, Confirmación de envío, Alert de spam

