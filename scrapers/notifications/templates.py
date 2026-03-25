"""Notification message templates for email, SMS, and WhatsApp."""

import os


APP_URL = os.environ.get("NEXT_PUBLIC_APP_URL", "https://rentdanang.app")


def _format_price(listing: dict) -> str:
    """Format price for display."""
    price_vnd = listing.get("price_vnd")
    price_usd = listing.get("price_usd")
    if price_vnd:
        return f"{price_vnd / 1_000_000:.0f}M VND"
    if price_usd:
        return f"${price_usd:.0f}"
    return "Price TBD"


def _listing_url(listing: dict) -> str:
    return f"{APP_URL}/listings/{listing.get('listing_id', '')}"


def build_email_html(listing: dict, search: dict) -> str:
    """Build HTML email for a new listing notification."""
    title = listing.get("title") or "New rental listing"
    area = listing.get("area_name") or "Da Nang"
    price = _format_price(listing)
    bedrooms = listing.get("bedrooms")
    br_text = f"{bedrooms} BR" if bedrooms is not None else ""
    prop_type = (listing.get("property_type") or "").capitalize()
    image = listing.get("first_image")
    url = _listing_url(listing)
    search_name = search.get("name") or "your saved search"

    image_html = ""
    if image:
        image_html = f"""
        <div style="margin-bottom: 16px;">
          <img src="{image}" alt="{title}" style="width: 100%; max-width: 400px; border-radius: 8px; object-fit: cover; height: 200px;" />
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #1f2937;">
      <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 16px 20px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; color: white; font-size: 18px;">New listing matches "{search_name}"</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 20px;">
        {image_html}
        <h3 style="margin: 0 0 8px; font-size: 16px; color: #111827;">{title}</h3>
        <p style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #d97706;">{price}</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280;">
          {" / ".join(filter(None, [prop_type, br_text, area]))}
        </p>
        <a href="{url}" style="display: inline-block; background: #f59e0b; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Listing
        </a>
      </div>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">
        You're receiving this because of your saved search on <a href="{APP_URL}" style="color: #f59e0b;">RentDaNang</a>.
        <br/>Manage your alerts in <a href="{APP_URL}/account" style="color: #f59e0b;">Account Settings</a>.
      </p>
    </body>
    </html>
    """


def build_sms_text(listing: dict, search: dict) -> str:
    """Build SMS text for a new listing notification."""
    area = listing.get("area_name") or "Da Nang"
    price = _format_price(listing)
    bedrooms = listing.get("bedrooms")
    br_text = f", {bedrooms}BR" if bedrooms is not None else ""
    url = _listing_url(listing)

    return f"RentDaNang: New listing in {area}: {price}{br_text} - {url}"


def build_whatsapp_text(listing: dict, search: dict) -> str:
    """Build WhatsApp text for a new listing notification."""
    title = listing.get("title") or "New rental listing"
    area = listing.get("area_name") or "Da Nang"
    price = _format_price(listing)
    bedrooms = listing.get("bedrooms")
    br_text = f"{bedrooms} BR" if bedrooms is not None else ""
    prop_type = (listing.get("property_type") or "").capitalize()
    url = _listing_url(listing)

    specs = " / ".join(filter(None, [prop_type, br_text, area]))
    return f"*New listing on RentDaNang*\n\n{title}\n{price} - {specs}\n\n{url}"
