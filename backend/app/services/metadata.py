from PIL import Image as PILImage, ExifTags
from datetime import datetime
import logging
import os

logger = logging.getLogger("backend")


def get_exif_data(image):
    """Returns a dictionary from the exif data of an PIL Image item. Also converts the GPS Tags"""
    exif_data = {}
    info = None
    if hasattr(image, "getexif"):
        info = image.getexif()
    elif hasattr(image, "_getexif"):
        info = image._getexif()
    if info:
        for tag, value in info.items():
            decoded = ExifTags.TAGS.get(tag, tag)
            if decoded == "GPSInfo":
                gps_data = {}
                # If value is an int (offset), try to retrieve IFD
                if isinstance(value, int) and hasattr(image, "getexif"):
                    try:
                        # 34853 is GPSInfo tag
                        gps_ifd = image.getexif().get_ifd(34853)
                        for t, v in gps_ifd.items():
                            sub_decoded = ExifTags.GPSTAGS.get(t, t)
                            gps_data[sub_decoded] = v
                    except Exception:
                        pass
                elif isinstance(value, dict):
                    # Classic dictionary
                    for t in value:
                        sub_decoded = ExifTags.GPSTAGS.get(t, t)
                        gps_data[sub_decoded] = value[t]

                exif_data[decoded] = gps_data
            else:
                exif_data[decoded] = value
    return exif_data


def _get_if_exist(data, key):
    if key in data:
        return data[key]
    return None


def _convert_to_degrees(value):
    """Helper function to convert the GPS coordinates stored in the EXIF to degress in float format"""
    d = value[0]
    m = value[1]
    s = value[2]
    return d + (m / 60.0) + (s / 3600.0)


def get_lat_lon(exif_data):
    """Returns the latitude and longitude, if available, from the provided exif_data (obtained through get_exif_data above)"""
    lat = None
    lon = None

    if "GPSInfo" in exif_data:
        gps_info = exif_data["GPSInfo"]

        gps_latitude = _get_if_exist(gps_info, "GPSLatitude")
        gps_latitude_ref = _get_if_exist(gps_info, "GPSLatitudeRef")
        gps_longitude = _get_if_exist(gps_info, "GPSLongitude")
        gps_longitude_ref = _get_if_exist(gps_info, "GPSLongitudeRef")

        if gps_latitude and gps_latitude_ref and gps_longitude and gps_longitude_ref:
            lat = _convert_to_degrees(gps_latitude)
            if gps_latitude_ref != "N":
                lat = 0 - lat

            lon = _convert_to_degrees(gps_longitude)
            if gps_longitude_ref != "E":
                lon = 0 - lon

    return lat, lon


def extract_metadata(file_path: str):
    """
    Extracts DateTimeOriginal, Latitude, Longitude.
    Returns dict.
    """
    metadata = {
        "capture_date": None,
        "latitude": None,
        "longitude": None,
        "format": None,
    }

    try:
        with PILImage.open(file_path) as img:
            metadata["format"] = img.format
            exif = get_exif_data(img)

            # Date
            # Try multiple keys for date
            date_str = exif.get("DateTimeOriginal")
            if not date_str:
                date_str = exif.get("DateTimeDigitized")
            if not date_str:
                date_str = exif.get("DateTime")

            if date_str:
                try:
                    # Format: YYYY:MM:DD HH:MM:SS
                    metadata["capture_date"] = datetime.strptime(
                        date_str, "%Y:%m:%d %H:%M:%S"
                    )
                except ValueError:
                    pass

            # Fallback to file modification time if still None
            if not metadata["capture_date"]:
                try:
                    mtime = os.path.getmtime(file_path)
                    metadata["capture_date"] = datetime.fromtimestamp(mtime)
                except Exception:
                    pass

            # GPS
            lat, lon = get_lat_lon(exif)
            metadata["latitude"] = lat
            metadata["longitude"] = lon

    except Exception as e:
        logger.warning(f"Metadata extraction failed for {file_path}: {e}")

    return metadata
