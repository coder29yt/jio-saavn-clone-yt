import { Link } from "react-router-dom";
const AlbumItem = ({ name, artists, id, image, title }) => {
  return (
    <Link
      to={`/albums/${id}`}
      className="w-[160px] max-h-[220px] overflow-y-clip flex flex-col justify-center items-center gap-3 rounded-lg"
    >
      <img src={image[2].link} alt="" className="rounded-lg" />
      <div className="text-[13px] w-full flex flex-col justify-center items-center">
        <span className="text-gray-600 font-semibold overflow-x-clip">
          {name}
        </span>
        <p className="text-gray-500 font-thin">
          {artists.map((artist) => artist.name).join(",").length > 24
            ? artists
                .map((artist) => artist.name)
                .join(",")
                .slice(0, 24) + "..."
            : artists.map((artist) => artist.name).join(",")}
        </p>
      </div>
    </Link>
  );
};

export default AlbumItem;
