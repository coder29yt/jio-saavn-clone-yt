export const url = "https://jiosaavn-api-cyan-theta.vercel.app"
export const album = `${url}/api/search/albums`
export const albumById = `${url}/api/albums?id=`
export const playlistById = `${url}/api/playlists?limit=50&page=0&id=`
export const songs = `${url}/api/search/songs`
export const search = `${url}/api/search?query=`
export const artistById = `${url}/api/artists/`
export const playlistSearch = `${url}/api/search/playlists?page=0&limit=25&query=`
export const searchArtist = `${url}/api/search/artists?page=0&limit=25&query=`
export const modules = `${url}/api/search/albums?query=`
export const lyrics = `${url}/api/songs/`
export const suggestions = (id: string) => `${url}/api/songs/${id}/suggestions`
