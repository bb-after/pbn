import React from 'react';
import { GeoAnalysisResult } from '../utils/ai-engines';
import { formatSuperstarContent } from '../utils/formatSuperstarContent';
// Using a plain <img> for predictable rendering in PDFs
interface GeoPdfExportProps {
  result: GeoAnalysisResult;
}

const GeoPdfExport = React.forwardRef<HTMLDivElement, GeoPdfExportProps>(({ result }, ref) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '#4caf50';
      case 'negative':
        return '#f44336';
      case 'mixed':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '👍';
      case 'negative':
        return '👎';
      case 'mixed':
        return '⚖️';
      default:
        return '😐';
    }
  };

  return (
    <div
      ref={ref}
      style={{
        padding: '30px',
        backgroundColor: 'white',
        color: 'black',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '900px',
        margin: '0 auto',
      }}
    >
      {/* Header with Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div
          style={{
            margin: '0 auto 20px auto',
            backgroundColor: '#000',
            padding: '15px',
            borderRadius: '3px',
          }}
        >
          <img
            src="/images/sl-logo.png"
            alt="Status Labs Logo"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
            }}
          />
        </div>
        <h1
          style={{
            color: 'black',
            marginBottom: '16px',
            fontWeight: 'bold',
            fontSize: '32px',
            margin: '0 0 16px 0',
          }}
        >
          GEO Analysis Report
        </h1>
        <h2
          style={{
            color: 'black',
            marginBottom: '16px',
            fontWeight: '500',
            fontSize: '24px',
            margin: '0 0 16px 0',
          }}
        >
          Keyword: &quot;{result.keyword}&quot;
        </h2>
        <h3
          style={{ color: 'black', marginBottom: '16px', fontSize: '20px', margin: '0 0 16px 0' }}
        >
          Client: {result.clientName}
        </h3>
        <p style={{ color: '#666', fontSize: '16px', margin: '0' }}>
          Generated: {new Date(result.timestamp).toLocaleString()}
        </p>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '0 0 24px 0' }} />

      {/* Overall Sentiment */}
      <div
        style={{
          padding: '24px',
          marginBottom: '32px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
        }}
      >
        <h2
          style={{
            color: 'black',
            marginBottom: '24px',
            fontWeight: 'bold',
            fontSize: '28px',
            margin: '0 0 24px 0',
          }}
        >
          📊 Overall Sentiment Analysis
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <span style={{ marginRight: '24px', fontSize: '48px' }}>
            {getSentimentIcon(result.aggregatedInsights.overallSentiment)}
          </span>
          <h3
            style={{
              color: getSentimentColor(result.aggregatedInsights.overallSentiment),
              fontWeight: 'bold',
              fontSize: '24px',
              margin: '0',
            }}
          >
            {result.aggregatedInsights.overallSentiment.toUpperCase()}
          </h3>
        </div>

        <h4
          style={{
            color: 'black',
            marginBottom: '16px',
            fontWeight: 'bold',
            fontSize: '20px',
            margin: '0 0 16px 0',
          }}
        >
          Breakdown by Engine:
        </h4>
        <p style={{ color: 'black', fontSize: '18px', margin: '0', lineHeight: '1.5' }}>
          👍 Positive: {result.aggregatedInsights.sentimentBreakdown.positive.count} | 👎 Negative:{' '}
          {result.aggregatedInsights.sentimentBreakdown.negative.count} | 😐 Neutral:{' '}
          {result.aggregatedInsights.sentimentBreakdown.neutral.count} | ⚖️ Mixed:{' '}
          {result.aggregatedInsights.sentimentBreakdown.mixed.count}
        </p>
      </div>

      {/* Top Tags */}
      {result.aggregatedInsights.topTags.length > 0 && (
        <div
          style={{
            padding: '24px',
            marginBottom: '32px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <h2
            style={{
              color: 'black',
              marginBottom: '24px',
              fontWeight: 'bold',
              fontSize: '28px',
              margin: '0 0 24px 0',
            }}
          >
            🏷️ Top Tags Identified
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {result.aggregatedInsights.topTags.slice(0, 10).map((tag, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                  marginRight: '16px',
                }}
              >
                <span style={{ color: 'black', fontSize: '18px' }}>
                  <strong>{tag.tag}</strong> ({tag.count}x, {tag.engines.length} engines)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {result.aggregatedInsights.sources.length > 0 && (
        <div
          style={{
            padding: '24px',
            marginBottom: '32px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <h2
            style={{
              color: 'black',
              marginBottom: '24px',
              fontWeight: 'bold',
              fontSize: '28px',
              margin: '0 0 24px 0',
            }}
          >
            📚 Sources Mentioned
          </h2>
          {result.aggregatedInsights.sources.slice(0, 8).map((source, index) => (
            <p
              key={index}
              style={{ color: 'black', marginBottom: '8px', fontSize: '18px', margin: '0 0 8px 0' }}
            >
              • <strong>{source.source}</strong> - {source.count} mentions ({source.engines.length}{' '}
              engines)
            </p>
          ))}
        </div>
      )}

      {/* URL Sources */}
      {result.aggregatedInsights.urlSources && result.aggregatedInsights.urlSources.length > 0 && (
        <div
          style={{
            padding: '24px',
            marginBottom: '32px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <h2
            style={{
              color: 'black',
              marginBottom: '24px',
              fontWeight: 'bold',
              fontSize: '28px',
              margin: '0 0 24px 0',
            }}
          >
            🔗 URLs Referenced by AI Engines
          </h2>
          {result.aggregatedInsights.urlSources.slice(0, 10).map((urlSource, index) => (
            <div
              key={index}
              style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <p
                style={{
                  color: '#1976d2',
                  marginBottom: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  margin: '0 0 4px 0',
                  wordBreak: 'break-all',
                }}
              >
                {urlSource.source}
              </p>
              <p
                style={{
                  color: '#666',
                  fontSize: '14px',
                  margin: '0',
                }}
              >
                Referenced by {urlSource.engines.join(', ')} ({urlSource.count} times)
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Ahrefs Brand Radar Data */}
      {result.aggregatedInsights.ahrefsData &&
        result.aggregatedInsights.ahrefsData.totalAIMentions > 0 && (
          <div
            style={{
              padding: '24px',
              marginBottom: '32px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
            }}
          >
            <h2
              style={{
                color: 'black',
                marginBottom: '24px',
                fontWeight: 'bold',
                fontSize: '28px',
                margin: '0 0 24px 0',
              }}
            >
              🤖 AI Platform Mentions (Ahrefs Brand Radar)
            </h2>

            <p
              style={{ color: 'black', fontSize: '20px', fontWeight: 'bold', margin: '0 0 16px 0' }}
            >
              Total AI Mentions: {result.aggregatedInsights.ahrefsData.totalAIMentions}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              {result.aggregatedInsights.ahrefsData.aiMentions.map((mention, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    minWidth: '150px',
                  }}
                >
                  <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                    {mention.mentions}
                  </div>
                  <div style={{ fontSize: '16px', margin: '0' }}>{mention.source} mentions</div>
                </div>
              ))}
            </div>

            <h3
              style={{
                color: 'black',
                marginBottom: '16px',
                fontWeight: 'bold',
                fontSize: '22px',
                margin: '0 0 16px 0',
              }}
            >
              AI Visibility Insights:
            </h3>
            {result.aggregatedInsights.ahrefsData.aiVisibilityInsights.map((insight, index) => (
              <p
                key={index}
                style={{
                  color: 'black',
                  marginBottom: '8px',
                  fontSize: '18px',
                  margin: '0 0 8px 0',
                }}
              >
                • {insight}
              </p>
            ))}

            {/* Sample AI Responses */}
            {result.aggregatedInsights.ahrefsData.aiMentions.some(
              m => m.sample_responses.length > 0
            ) && (
              <div style={{ marginTop: '24px' }}>
                <h3
                  style={{
                    color: 'black',
                    marginBottom: '16px',
                    fontWeight: 'bold',
                    fontSize: '22px',
                    margin: '0 0 16px 0',
                  }}
                >
                  Sample AI Responses:
                </h3>
                {result.aggregatedInsights.ahrefsData.aiMentions
                  .filter(m => m.sample_responses.length > 0)
                  .slice(0, 3)
                  .map((mention, index) => (
                    <div key={index} style={{ marginBottom: '20px' }}>
                      <p
                        style={{
                          color: '#1976d2',
                          fontWeight: 'bold',
                          fontSize: '18px',
                          margin: '0 0 8px 0',
                        }}
                      >
                        {mention.source}:
                      </p>
                      {mention.sample_responses.slice(0, 1).map((response, resIndex) => (
                        <div
                          key={resIndex}
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            padding: '12px',
                            borderRadius: '4px',
                            marginBottom: '8px',
                          }}
                        >
                          <p
                            style={{
                              color: 'black',
                              fontStyle: 'italic',
                              fontSize: '16px',
                              margin: '0',
                              lineHeight: '1.5',
                            }}
                          >
                            &quot;
                            {response.length > 300 ? response.substring(0, 300) + '...' : response}
                            &quot;
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

      {/* Sentiment Highlights */}
      {(result.aggregatedInsights.mainSentimentHighlights.positive.length > 0 ||
        result.aggregatedInsights.mainSentimentHighlights.negative.length > 0) && (
        <div
          style={{
            padding: '24px',
            marginBottom: '32px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <h2
            style={{
              color: 'black',
              marginBottom: '24px',
              fontWeight: 'bold',
              fontSize: '28px',
              margin: '0 0 24px 0',
            }}
          >
            💬 Key Sentiment Highlights
          </h2>

          {result.aggregatedInsights.mainSentimentHighlights.positive.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h3
                style={{
                  color: '#4caf50',
                  marginBottom: '16px',
                  fontWeight: 'bold',
                  fontSize: '22px',
                  margin: '0 0 16px 0',
                }}
              >
                👍 Positive Insights:
              </h3>
              {result.aggregatedInsights.mainSentimentHighlights.positive.map(
                (highlight, index) => (
                  <p
                    key={index}
                    style={{
                      color: 'black',
                      marginBottom: '16px',
                      fontStyle: 'italic',
                      fontSize: '18px',
                      margin: '0 0 16px 0',
                    }}
                  >
                    &quot;{highlight}&quot;
                  </p>
                )
              )}
            </div>
          )}

          {result.aggregatedInsights.mainSentimentHighlights.negative.length > 0 && (
            <div>
              <h3
                style={{
                  color: '#f44336',
                  marginBottom: '16px',
                  fontWeight: 'bold',
                  fontSize: '22px',
                  margin: '0 0 16px 0',
                }}
              >
                👎 Areas for Attention:
              </h3>
              {result.aggregatedInsights.mainSentimentHighlights.negative.map(
                (highlight, index) => (
                  <p
                    key={index}
                    style={{
                      color: 'black',
                      marginBottom: '16px',
                      fontStyle: 'italic',
                      fontSize: '18px',
                      margin: '0 0 16px 0',
                    }}
                  >
                    &quot;{highlight}&quot;
                  </p>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Key Themes */}
      {result.aggregatedInsights.keyThemes.length > 0 && (
        <div
          style={{
            padding: '24px',
            marginBottom: '32px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <h2
            style={{
              color: 'black',
              marginBottom: '24px',
              fontWeight: 'bold',
              fontSize: '28px',
              margin: '0 0 24px 0',
            }}
          >
            🎯 Key Themes Identified
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {result.aggregatedInsights.keyThemes.map((theme, index) => (
              <span
                key={index}
                style={{
                  color: 'black',
                  backgroundColor: '#e3f2fd',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  display: 'inline-block',
                  fontSize: '18px',
                  fontWeight: '500',
                  margin: '4px',
                }}
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div
        style={{
          padding: '24px',
          marginBottom: '32px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
        }}
      >
        <h2
          style={{
            color: 'black',
            marginBottom: '24px',
            fontWeight: 'bold',
            fontSize: '28px',
            margin: '0 0 24px 0',
          }}
        >
          📋 Analysis Summary
        </h2>
        {result.aggregatedInsights.commonInsights.map((insight, index) => (
          <p
            key={index}
            style={{ color: 'black', marginBottom: '8px', fontSize: '18px', margin: '0 0 8px 0' }}
          >
            • {insight}
          </p>
        ))}
      </div>

      {/* Recommendations */}
      {result.aggregatedInsights.recommendations.length > 0 && (
        <div
          style={{
            padding: '24px',
            marginBottom: '32px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <h2
            style={{
              color: 'black',
              marginBottom: '24px',
              fontWeight: 'bold',
              fontSize: '28px',
              margin: '0 0 24px 0',
            }}
          >
            💡 Top Recommendations
          </h2>
          {result.aggregatedInsights.recommendations.slice(0, 5).map((rec, index) => (
            <p
              key={index}
              style={{
                color: 'black',
                marginBottom: '16px',
                fontSize: '18px',
                margin: '0 0 16px 0',
              }}
            >
              {index + 1}. {rec}
            </p>
          ))}
        </div>
      )}

      {/* Individual Engine Results */}
      <div
        style={{
          padding: '24px',
          marginBottom: '32px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
        }}
      >
        <h2
          style={{
            color: 'black',
            marginBottom: '24px',
            fontWeight: 'bold',
            fontSize: '28px',
            margin: '0 0 24px 0',
          }}
        >
          🤖 Individual Engine Results
        </h2>
        {result.results.map((engineResult, index) => (
          <div
            key={index}
            style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '2px solid #ddd' }}
          >
            <h3
              style={{
                color: 'black',
                fontWeight: 'bold',
                marginBottom: '16px',
                fontSize: '22px',
                margin: '0 0 16px 0',
              }}
            >
              {engineResult.engine} ({engineResult.model})
            </h3>
            {engineResult.error ? (
              <p style={{ color: '#f44336', fontSize: '18px', margin: '0' }}>
                Error: {engineResult.error}
              </p>
            ) : (
              <div
                style={{
                  color: 'black',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  margin: '0',
                }}
                dangerouslySetInnerHTML={{
                  __html: formatSuperstarContent(engineResult.summary, '').content,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '40px',
          paddingTop: '24px',
          borderTop: '2px solid #ddd',
        }}
      >
        <p style={{ color: '#666', fontSize: '16px', margin: '0 0 8px 0' }}>
          This report was generated using advanced AI analysis across multiple engines.
        </p>
        <p style={{ color: '#666', fontSize: '14px', margin: '0' }}>
          © Status Labs - Professional SEO & Marketing Intelligence
        </p>
      </div>
    </div>
  );
});

GeoPdfExport.displayName = 'GeoPdfExport';

export default GeoPdfExport;
