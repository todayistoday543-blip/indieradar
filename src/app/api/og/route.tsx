import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'IndieRadar JP';

    // Truncate title to ~80 chars for clean display
    const displayTitle =
      title.length > 80 ? title.slice(0, 77) + '...' : title;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0B0B0C',
            padding: '60px 80px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Top bar: branding + accent line */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '12px',
            }}
          >
            {/* Gold diamond icon */}
            <div
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: '#C9A94E',
                transform: 'rotate(45deg)',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#C9A94E',
                letterSpacing: '-0.5px',
              }}
            >
              IndieRadar
            </div>
          </div>

          {/* Gold accent line */}
          <div
            style={{
              width: '120px',
              height: '3px',
              backgroundColor: '#C9A94E',
              marginBottom: '40px',
              borderRadius: '2px',
            }}
          />

          {/* Article title */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: displayTitle.length > 50 ? '44px' : '52px',
                fontWeight: 700,
                color: '#E8E6E1',
                lineHeight: 1.3,
                letterSpacing: '-0.5px',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayTitle}
            </div>
          </div>

          {/* Bottom: source indicators */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
              }}
            >
              {/* Hacker News */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#FF6600',
                  }}
                />
                <span
                  style={{
                    fontSize: '16px',
                    color: '#8A857D',
                    fontWeight: 500,
                  }}
                >
                  Hacker News
                </span>
              </div>

              {/* Product Hunt */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#DA552F',
                  }}
                />
                <span
                  style={{
                    fontSize: '16px',
                    color: '#8A857D',
                    fontWeight: 500,
                  }}
                >
                  Product Hunt
                </span>
              </div>

              {/* Reddit */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#FF4500',
                  }}
                />
                <span
                  style={{
                    fontSize: '16px',
                    color: '#8A857D',
                    fontWeight: 500,
                  }}
                >
                  Reddit
                </span>
              </div>

              {/* X */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <span
                  style={{
                    fontSize: '16px',
                    color: '#8A857D',
                    fontWeight: 500,
                  }}
                >
                  X
                </span>
              </div>
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: '14px',
                color: '#5C5852',
                fontWeight: 400,
              }}
            >
              indieradar.jp
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error(`OG image generation failed: ${e instanceof Error ? e.message : String(e)}`);
    return new Response('Failed to generate OG image', { status: 500 });
  }
}
