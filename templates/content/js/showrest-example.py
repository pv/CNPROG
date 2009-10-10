
TEXT = """
\*fuu\* \`bar`

.. table:: Fubar beyond all
   :class: bar-
      foo

   =====  =====
   fii    bar
   =====  =====
   ffu    uu
   ffa    aaa
   =====  =====

Spam spam spam spam *grail* *spanking* **virgins** and the **Castle
of Aaaaaaargh!** summa summarum *Sir John*.

    Foo foo foo bar quux

Also::

    Foo foo foo bar quux

| Moreover,
| Foo, foo
| Bar quux.

The snakes on the plane, `parrot <http://www.perl.org>`__, and some
`spam`_ and maybe `foo quux`_. http://python.org/

Foo::

    bar

Barf
====

Bar
---

Cheese [1] and spam [BLS]

.. _spam: http://www.spamhaus.org/
.. _foo quux: http://www.google.fi/
.. [1]: Off the mortal coil
.. [BLS]: Viking and Viking: The art of spam. Spam press (year of spam).
"""

HTML = """
<html>
  <head>
    <script type='text/javascript' src='jquery-1.2.6.js'></script>
    <script type='text/javascript' src='prettyprint.js'></script>
    <script type='text/javascript' src='showrest.js'></script>
  </head>
  <body>
    <div id='output'></div>
    <hr>
    <div>%(output)s</div>
    <hr>
    <div><pre id='input'>%(source)s</pre></div>
    <hr>
    <div><pre id='debug'></pre></div>
    <script>
      $().ready(function() {
        var converter = new showrest.converter();
        var text = $('#input').text();
        var html = converter.makeHtml(text);
        $('#input').text(html);
        $('#output').html(html);
      });
    </script>
  </body>
</html>
"""

def render_docutils(text):
    import docutils.writers.html4css1
    import docutils.core

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

def main():
    output = render_docutils(TEXT)
    html = HTML % dict(source=TEXT, output=output)

    f = open('showrest-example.html', 'w')
    f.write(html)
    f.close()

if __name__ == "__main__":
    main()
