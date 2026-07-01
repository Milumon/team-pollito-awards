export type StoryHighlight = {
  category: string;
  nominee: string;
  emoji: string;
  avatarUrl?: string | null;
};

export type StoryImageProps = {
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  voteCount: number;
  totalCategories: number;
  mvpName: string;
  mvpAvatarUrl?: string | null;
  highlights: StoryHighlight[];
};

export function StoryImage({
  displayName,
  username,
  avatarUrl,
  voteCount,
  totalCategories,
  mvpName,
  mvpAvatarUrl,
}: StoryImageProps) {
  // Use username with @ if available, else fallback to displayName
  const displayUser = username ? (username.startsWith('@') ? username : `@${username}`) : displayName;

  return (
    <div
      style={{
        width: '1080px',
        height: '1920px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#ffd400',
        boxSizing: 'border-box',
        fontFamily: 'Arial Black, Arial, sans-serif',
        padding: '50px 40px',
      }}
    >
      {/* Main Brutalist Card Container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '54px',
          border: '12px solid #000000',
          boxShadow: '22px 22px 0px 0px #000000',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Retro Window Top Header */}
        <div
          style={{
            height: '70px',
            backgroundColor: '#f6f7fb',
            borderBottom: '4px solid #000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 30px',
            color: '#9ca3af',
            fontSize: '20px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          <div style={{ display: 'flex', color: '#000000', fontWeight: 900 }}>1 AÑO DE STREAMS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div
              style={{
                padding: '6px 20px',
                border: '4px solid #000000',
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: 900,
                backgroundColor: '#ffffff',
                color: '#111827',
              }}
            >
              SALIR
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                border: '4px solid #000000',
                borderRadius: '16px',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              🔊
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            backgroundColor: '#ffd400',
            padding: '45px 40px',
            boxSizing: 'border-box',
            justifyContent: 'space-between',
          }}
        >
          {/* Top Info Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                padding: '12px 28px',
                backgroundColor: '#000000',
                color: '#fef08a',
                borderRadius: '999px',
                border: '5px solid #000000',
                fontSize: '26px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              ✨ Tu Ballot Oficial ✨
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 28px',
                borderRadius: '999px',
                border: '5px solid #000000',
                backgroundColor: '#ffffff',
                color: '#c2410c',
                fontSize: '26px',
                fontWeight: 900,
              }}
            >
              🐣 1er Aniversario
            </div>
          </div>

          {/* Huge Main Header */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              width: '100%',
            }}
          >
            <div style={{ fontSize: '90px', lineHeight: 0.9, fontWeight: 900, color: '#000000', textShadow: '8px 8px 0 #ffffff', textTransform: 'uppercase' }}>
              POLLITOS
            </div>
            <div style={{ fontSize: '90px', lineHeight: 0.9, fontWeight: 900, color: '#ea580c', textShadow: '8px 8px 0 #000000', textTransform: 'uppercase', marginTop: '10px' }}>
              AWARDS 2026
            </div>
            <div style={{ fontSize: '26px', color: '#000000', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '12px' }}>
              Team Pollito
            </div>
          </div>

          {/* Voter Card Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '8px solid #000000',
              borderRadius: '38px',
              boxShadow: '14px 14px 0px 0px #000000',
              padding: '30px 40px',
              gap: '24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '38px', fontWeight: 900, color: '#000000', lineHeight: 1.2 }}>
              Yo <span style={{ color: '#ea580c' }}>{displayUser}</span> voté en The Pollito Awards
            </div>

            <div
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '999px',
                backgroundColor: '#171717',
                border: '6px solid #000000',
                padding: '8px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {avatarUrl ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '999px',
                    backgroundImage: `url(${avatarUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    border: '4px solid #ffffff',
                  }}
                />
              ) : (
                <div style={{ fontSize: '70px', lineHeight: 1 }}>👑</div>
              )}

              <div
                style={{
                  position: 'absolute',
                  right: '-2px',
                  bottom: '-2px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '999px',
                  backgroundColor: '#facc15',
                  border: '4px solid #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                🐣
              </div>
            </div>
          </div>

          {/* Stats Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000000',
              border: '6px solid #000000',
              borderRadius: '28px',
              padding: '22px 30px',
              boxShadow: '10px 10px 0px 0px #ffffff',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Voté en {voteCount} de {totalCategories} categorías 🔥
            </div>
          </div>

          {/* MVP Card Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '8px solid #000000',
              borderRadius: '38px',
              boxShadow: '14px 14px 0px 0px #000000',
              padding: '30px 40px',
              gap: '24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '34px', fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mi elección de MVP del año fue:
            </div>

            <div
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '999px',
                backgroundColor: '#fef08a',
                border: '6px solid #000000',
                padding: '8px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {mvpAvatarUrl ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '999px',
                    backgroundImage: `url(${mvpAvatarUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    border: '4px solid #ffffff',
                  }}
                />
              ) : (
                <div style={{ fontSize: '70px', lineHeight: 1 }}>🏆</div>
              )}

              <div
                style={{
                  position: 'absolute',
                  right: '-2px',
                  bottom: '-2px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '999px',
                  backgroundColor: '#ea580c',
                  border: '4px solid #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                👑
              </div>
            </div>

            <div style={{ fontSize: '46px', fontWeight: 900, color: '#000000', lineHeight: 1.1 }}>
              {mvpName}
            </div>
          </div>

          {/* Brutalist Footer Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px 28px',
              borderRadius: '28px',
              backgroundColor: '#000000',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#facc15' }}>
                Creado con amor por la comunidad
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                Comunidad del Team Pollito
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 24px',
                borderRadius: '18px',
                backgroundColor: '#ffffff',
                color: '#000000',
                fontSize: '24px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                whiteSpace: 'nowrap',
                border: '4px solid #000000',
              }}
            >
              Ballot Oficial
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
