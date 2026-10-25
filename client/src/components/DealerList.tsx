import type { Dealer } from "../api";

const hostname = (url: string) => new URL(url).hostname.replace(/^www\./, "");

export default function DealerList({ dealers, model }: { dealers: Dealer[]; model: string }) {
  return (
    <div className="dealers">
      {dealers.map((d) => (
        <article key={d.name} className="dealer">
          <div className="dealer-head">
            <div>
              <h4>{d.name}</h4>
              <div className="muted small">{d.address}</div>
            </div>
            {d.rating && (
              <div className="rating" title={`${d.rating} stars from ${d.reviews?.toLocaleString() ?? "?"} Google reviews`}>
                ★ {d.rating}
                {d.reviews && <span className="muted small"> ({d.reviews.toLocaleString()})</span>}
              </div>
            )}
          </div>
          {d.hours && <div className="small hours">{d.hours}</div>}
          {d.quote && <blockquote className="small muted">“{d.quote}”</blockquote>}
          <div className="dealer-actions">
            {d.website && (
              <a className="btn" href={d.website} target="_blank" rel="noopener noreferrer">
                Visit {hostname(d.website)}
              </a>
            )}
            <a className="btn outline" href={d.inventoryUrl} target="_blank" rel="noopener noreferrer">
              Find {model} inventory
            </a>
            <a className="btn outline" href={d.directionsUrl} target="_blank" rel="noopener noreferrer">Directions</a>
            {d.phone && <a className="btn outline" href={`tel:${d.phone.replace(/[^\d+]/g, "")}`}>Call {d.phone}</a>}
          </div>
        </article>
      ))}
    </div>
  );
}
