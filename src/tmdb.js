/**
 * tmdb.js — TMDB API 유틸리티
 * API 키: import.meta.env.VITE_TMDB_KEY
 */

import axios from 'axios'

const BASE   = 'https://api.themoviedb.org/3'
const KEY    = import.meta.env.VITE_TMDB_KEY
const IMG    = 'https://image.tmdb.org/t/p'

/** 포스터 URL 생성 */
export const posterUrl = (path, size = 'w342') =>
  path ? `${IMG}/${size}${path}` : null

/** 배경 이미지 URL 생성 */
export const backdropUrl = (path, size = 'w780') =>
  path ? `${IMG}/${size}${path}` : null

/**
 * 영화 제목으로 검색
 * @param {string} query
 * @returns {Promise<Array>} 검색 결과 배열 (최대 8개)
 */
export async function searchMovies(query) {
  if (!query || !query.trim()) return []
  try {
    const { data } = await axios.get(`${BASE}/search/movie`, {
      params: {
        api_key: KEY,
        query: query.trim(),
        language: 'ko-KR',
        include_adult: false,
        page: 1,
      },
    })
    return (data.results || []).slice(0, 8).map(m => ({
      id:          m.id,
      title:       m.title,
      originalTitle: m.original_title,
      year:        m.release_date ? m.release_date.slice(0, 4) : '—',
      posterPath:  m.poster_path,
      rating:      m.vote_average ? m.vote_average.toFixed(1) : '—',
      overview:    m.overview || '',
    }))
  } catch (err) {
    console.error('[TMDB] searchMovies 오류:', err)
    return []
  }
}

/**
 * 영화 상세 정보 가져오기
 * @param {number} movieId
 * @returns {Promise<Object>} 상세 데이터
 */
export async function getMovieDetails(movieId) {
  try {
    const { data } = await axios.get(`${BASE}/movie/${movieId}`, {
      params: {
        api_key: KEY,
        language: 'ko-KR',
        append_to_response: 'credits',
      },
    })
    return {
      id:             data.id,
      title:          data.title,
      originalTitle:  data.original_title,
      year:           data.release_date ? data.release_date.slice(0, 4) : '—',
      releaseDate:    data.release_date || '',
      overview:       data.overview || '',
      posterPath:     data.poster_path,
      backdropPath:   data.backdrop_path,
      rating:         data.vote_average ? data.vote_average.toFixed(1) : '—',
      voteCount:      data.vote_count || 0,
      runtime:        data.runtime || null,
      genres:         (data.genres || []).map(g => g.name),
      director:       (data.credits?.crew || [])
                        .find(c => c.job === 'Director')?.name || '—',
    }
  } catch (err) {
    console.error('[TMDB] getMovieDetails 오류:', err)
    return null
  }
}
