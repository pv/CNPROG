"""
Format marked-up text to HTML.

"""

from django.conf import settings
import re, cgi

FORMATS = {}
FORMAT_RE = re.compile(r'^\s*#(plain|rst|markdown)\s')

def convert(text, format=None):
    """
    Convert text to HTML.

    Parameters
    ----------
    text : unicode
        Text to convert.
    format : {'plain', 'markdown', 'rst'}, optional
        Format to use.

        If not given, and the text contains '#rst' directive (or other
        formatter) in the beginning, that formatter is used instead.
        Otherwise, the formatter is determined by ``settings.DEFAULT_FORMAT``.

    Returns
    -------
    html : unicode
        HTML result.

    """
    if format is None:
        format, text = determine(text)
    return FORMATS[format](text)

def determine(text):
    """
    Determine the formatter to be used for the text.

    Returns
    -------
    format
        Formatter to use. The returned formatter is always available.
    text
        Source text, with possible directives removed.

    """

    m = FORMAT_RE.search(text)
    if m:
        format = m.group(1)
        text = text[m.end():]
    elif format is None:
        format = settings.DEFAULT_FORMAT

    if format not in FORMATS:
        format = 'plain'

    return format, text

# Markdown
try:
    from markdown2 import Markdown
    markdowner = Markdown(html4tags=True)
    def format_markdown(text):
        return markdowner.convert(text)
    FORMATS['markdown'] = format_markdown
except ImportError:
    pass

# ReStructuredText
try:
    import docutils.writers.html4css1
    import docutils.core

    def format_rst(text):
        settings = dict(
            # Formatter settings:
            halt_level=5, traceback=True,
            link_base='',
            stylesheet_path='',
            # Security settings:
            raw_enabled=0,
            file_insertion_enabled=0,
            _disable_config=1
            )
        parts = docutils.core.publish_parts(
            text,
            writer=docutils.writers.html4css1.Writer(),
            settings_overrides=settings)
        return parts['html_body']
    FORMATS['rst'] = format_rst
except ImportError:
    pass

# Nearly plain text
def format_plain(text):
    """
    Nearly-plain text.

    Empty line is converted to a paragraph break.
    Four spaces in front of a line to <pre> text.
    http:// links are converted to <a> tags.

    """
    text = cgi.escape(text)
    def sub_a(s):
        return re.sub(r'(http://[^\s"]*[^\s".,?!])', r'<a href="\1">\1</a>',
                      s)
    parts = text.split("\n")
    in_pre = False
    for j, part in enumerate(parts):
        if part == '':
            if not in_pre:
                parts[j] = "</p>\n<p>"
        elif part.startswith('    '):
            if not in_pre:
                in_pre = True
                parts[j] = '<pre>' + part[4:]
            else:
                parts[j] = part[4:]
        else:
            if in_pre:
                parts[j] = '</pre>' + part
            parts[j] = sub_a(parts[j])
            in_pre = False
    if in_pre:
        parts.append("</pre>")
    return "<p>" + "\n".join(parts) + "</p>"
FORMATS['plain'] = format_plain
