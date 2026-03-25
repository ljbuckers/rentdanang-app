import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from config import DATABASE_URL

psycopg2.extras.register_uuid()


def get_connection():
    return psycopg2.connect(DATABASE_URL)


@contextmanager
def get_cursor(dict_cursor=True):
    conn = get_connection()
    try:
        cursor_factory = (
            psycopg2.extras.RealDictCursor if dict_cursor else None
        )
        cur = conn.cursor(cursor_factory=cursor_factory)
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
