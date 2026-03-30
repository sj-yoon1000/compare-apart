// --- Utilities ---
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function sanitizeUrl(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) ? url : '';
    } catch {
        return '';
    }
}

// --- Data Loading ---
async function loadData() {
    const res = await fetch('apartments.json');
    return res.json();
}

// --- Gangnam Time Color ---
function gangnamColorClass(minutes) {
    if (minutes <= 15) return 'gangnam-fast';
    if (minutes <= 30) return 'gangnam-medium';
    return 'gangnam-slow';
}

// --- Sorting ---
function getMinNonLowPrice(apt) {
    const prices = apt.listings.filter(l => !l.is_low_floor).map(l => l.price);
    return prices.length ? Math.min(...prices) : Infinity;
}

function getMaxNonLowPrice(apt) {
    const prices = apt.listings.filter(l => !l.is_low_floor).map(l => l.price);
    return prices.length ? Math.max(...prices) : -Infinity;
}

function sortApartments(apartments, sortKey) {
    switch (sortKey) {
        case 'gangnam':
            apartments.sort((a, b) => a.gangnam_minutes - b.gangnam_minutes);
            break;
        case 'price-asc':
            apartments.sort((a, b) => getMinNonLowPrice(a) - getMinNonLowPrice(b));
            break;
        case 'price-desc':
            apartments.sort((a, b) => getMaxNonLowPrice(b) - getMaxNonLowPrice(a));
            break;
        case 'units':
            apartments.sort((a, b) => b.total_units - a.total_units);
            break;
        case 'area':
            apartments.sort((a, b) => a.area_sqm - b.area_sqm);
            break;
    }
}

// --- Rendering ---
function renderApartments(apartments) {
    const container = document.getElementById('apartment-list');
    container.innerHTML = '';

    apartments.forEach((apt, index) => {
        const listingCount = apt.listings.length;
        const e = escapeHtml;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div class="rank">
                    <div class="rank-label">순위</div>
                    <div class="rank-number">${index + 1}</div>
                </div>
                <div class="card-info">
                    <div class="card-name">${e(apt.name)}</div>
                    <div class="card-sub">${e(apt.region)} · ${e(apt.type)} · ${apt.total_units.toLocaleString()}세대</div>
                </div>
                <div class="stat">
                    <div class="stat-label">강남역</div>
                    <div class="stat-value ${gangnamColorClass(apt.gangnam_minutes)}">${apt.gangnam_minutes}분</div>
                </div>
                <div class="stat">
                    <div class="stat-label">매매가</div>
                    <div class="stat-value">${e(apt.price_range)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">매물</div>
                    <div class="stat-value" style="font-size:16px;color:#495057;">${listingCount}건</div>
                </div>
                <div class="toggle-arrow">▶</div>
            </div>
            <div class="card-detail">
                <div class="detail-content">
                    <div class="detail-info">
                        <div class="detail-grid">
                            <div>
                                <div class="detail-section-title">교통</div>
                                <div class="detail-item">🚇 강남역 <strong>${apt.gangnam_minutes}분</strong> (${e(apt.gangnam_transport)})</div>
                                <div class="detail-item">🚶 ${e(apt.nearest_station)} 도보 <strong>${apt.station_walk_min}분</strong></div>
                            </div>
                            <div>
                                <div class="detail-section-title">단지 정보</div>
                                <div class="detail-item">📐 전용 ${apt.area_sqm}㎡ (${e(apt.type)}타입)</div>
                                <div class="detail-item">🏢 ${apt.built_year}년 입주</div>
                                <div class="detail-item">🏘️ 총 ${apt.total_units.toLocaleString()}세대</div>
                            </div>
                            <div>
                                <div class="detail-section-title">주변환경</div>
                                <div class="detail-item">🛒 ${e(apt.mart || '정보 없음')}</div>
                                <div class="detail-item">🏪 ${e(apt.commercial || '정보 없음')}</div>
                                <div class="detail-item ${apt.nimby === '없음' ? 'nimby-ok' : ''}">${apt.nimby === '없음' ? '✅ 혐오시설 없음' : '⚠️ ' + e(apt.nimby)}</div>
                            </div>
                            <div>
                                <div class="detail-section-title">학교</div>
                                <div class="detail-item">🏫 ${e(apt.schools || '정보 없음')}</div>
                            </div>
                        </div>
                    </div>
                    <div class="map-container">
                        <div class="detail-section-title">강남역 대중교통 경로</div>
                        ${apt.map_image
                            ? `<img class="map-image" src="maps/${encodeURIComponent(apt.map_image)}" alt="${e(apt.name)} → 강남역 경로">`
                            : '<div class="map-placeholder">🗺️ 지도 없음</div>'
                        }
                        <div class="map-caption">${e(apt.name)} → 강남역 · 대중교통 ${apt.gangnam_minutes}분</div>
                    </div>
                </div>
                <div class="listings-section">
                    <div class="detail-section-title">개별 매물 목록</div>
                    <table class="listing-table">
                        <thead>
                            <tr>
                                <th>층수</th>
                                <th>매매가</th>
                                <th>네이버 부동산 설명</th>
                                <th>링크</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${apt.listings.map(l => {
                                const safeUrl = sanitizeUrl(l.naver_url);
                                return `
                                <tr class="${l.is_low_floor ? 'low-floor' : ''}">
                                    <td><strong>${e(l.floor)}</strong>${l.is_low_floor ? '<span class="low-badge">저층</span>' : ''}</td>
                                    <td class="listing-price">${l.price}억</td>
                                    <td class="listing-memo">${e(l.memo)}</td>
                                    <td>${safeUrl ? `<a class="listing-link" href="${safeUrl}" target="_blank" rel="noopener">🔗</a>` : ''}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    <div class="listings-note">* 저층(5층 이하) 매물은 매매가 범위에 포함되지 않습니다</div>
                </div>
            </div>
        `;

        // Toggle dropdown on header click
        card.querySelector('.card-header').addEventListener('click', () => {
            card.classList.toggle('open');
        });

        container.appendChild(card);
    });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadData();
    const apartments = data.apartments;

    // Default sort: gangnam
    sortApartments(apartments, 'gangnam');
    renderApartments(apartments);

    document.getElementById('footer').textContent =
        `최종 업데이트: ${data.generated_at.replace('T', ' ')}`;

    document.getElementById('sort-select').addEventListener('change', (e) => {
        sortApartments(apartments, e.target.value);
        renderApartments(apartments);
    });
});
