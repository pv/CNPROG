/*
 * showrest.js -- JavaScript implementation of a subset of ReStructuredText.
 *
 * The fundamental imperative is: input accepted by Showrest must
 * be *some* subset of valid Rst.
 */

/*
 * Copyright (C) 2009 Pauli Virtanen
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 * 
 * - Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * 
 * - Redistributions in binary form must reproduce the above
 *   copyright notice, this list of conditions and the following
 *   disclaimer in the documentation and/or other materials provided
 *   with the distribution.
 * 
 * - Neither the name of the copyright holder nor the names of any
 *   contributors may be used to endorse or promote products derived
 *   from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */ 

/*
 * Showrest usage::
 *
 *     var text = "RST *rocks*.";
 *     var converter = new showrest.converter();
 *     var html = converter.makeHtml(text);
 *     alert(html);
 */

var showrest = function() {};

var debugTables = [];
function debug(obj) {
    var text = $("#debug").text() + "\n********\n";
    var step = 2;

    gen_indent = function(n) {
        var x = "";
        for (i = 0; i < n; ++i) {
            x += " ";
        }
        return x;
    }

    walk = function(o, n) {
        var t = "";
        if (o == null) {
            t = "null";
        } else if (o['join']) {
            var its = [];
            var ind = gen_indent(n);
            var ind2 = gen_indent(n+step);
            var acc_len = ind.length;
            var was_list = false;
            var i;
            t = "[";
            for (i = 0; i < o.length; ++i) {
                s = walk(o[i], n+step);
                acc_len += s.length;
                if (s[0] == '[' || s[0] == '{') {
                    t += "\n" + ind2 + s;
                    was_list = true;
                } else if (was_list) {
                    t += "\n" + ind2 + s;
                    was_list = false;
                } else {
                    t += s;
                }
                t += ", ";
            }
            t = t.replace(/, $/, '');
            t += "]";
        } else if (o['charAt']) {
            t = "\"" + o.replace("\"", "\\\"") + "\"";
        } else if (o['toString']) {
            t = o.toString();
        } else {
            t = String(o);
        }
        return t;
    }

    $("#debug").text(text + walk(obj, 0));
}

/*
 * Converter
 */
showrest.converter = function() {

    /*
     * Convert RST to HTML
     */
    this.makeHtml = function(text) {
        tokens = this.tokenize(text);
        tree = this.parse(tokens);
        //debug(tree[2]);
        html = this.render(tree[2]);

        return "<p>" + html + "</p>";
    }

    /*
     * Render HTML based on a parse tree.
     */
    this.render = function(items) {
        var html = "";
        var i;
        for (i = 0; i < items.length; ++i) {
            html += this.render_one(i, items);
        }
        return html;
    }

    this.render_one = function(i, items) {
        var item = items[i];
        var name = item[0];

        if (this["visit_" + name]) {
            return this["visit_" + name](item, i, items);
        }
        return "";
    }

    this.escape = function(text) {
        text = new String(text);
        return text.replace('<', '&lt;').replace('>', '&gt;').replace('&','&amp;');
    }

    this.visit_inline = function(item, i, items) {
        var html = "";
        html += "<p>" + this.render(item[2]) + "</p>\n";
        return html;
    }

    this.visit_text = function(item, i, items) {
        return this.escape(item[1]);
    }

    this.visit_emph = function(item, i, items) {
        return "<em>" + this.escape(item[1]) + "</em>";
    }

    this.visit_strong = function(item, i, items) {
        return "<strong>" + this.escape(item[1]) + "</strong>";
    }

    this.visit_list = function(item, i, items) {
        var first_list = (i == 0 || items[i-1][0] != 'list');
        var last_list = (i == items.length-1 || !items[i+1] 
                         || items[i+1][0] != 'list');
        var html = "";

        if (first_list) {
            /* FIXME: parse list type elsewhere */
            html += "<ol>";
        }

        html += "<li>" + this.render(item[2]) + "</li>";

        if (last_list) {
            /* FIXME: parse list type elsewhere */
            //debug("XXX");
            //debug((i) + " :: " + (i+1));
            html += "</ol>\n";
        }

        return html;
    }

    this.visit_section = function(item, i, items) {
        /* FIXME: parse section underlines globally */
        return "<h1>" + this.escape(item[1][0]) + "</h1>\n";
    }

    this.visit_target = function(item, i, items) {
        /* skip */
        /* FIXME: parse targets globally */
        return "";
    }

    this.visit_foot = function(item, i, items) {
        /* FIXME: render footnotes */
        /* FIXME: parse footnote references globally */
        return "<NOTIMPLEMENTED: footnote>";
    }

    this.visit_block = function(item, i, items) {
        return "<div>" + this.render(item[2]) + "</div>\n";
    }

    this.visit_link = function(item, i, items) {
        /* FIXME: implement link parsing elsewhere properly */
        m = item[1][0].match(/^(.*)\s+<(.+)>\s*$/);
        if (m) {
            debug(m);
            return "<a href=\"" + encodeURI(m[2]) + "\">" + this.escape(m[1]) + "</a>";
        } else {
            /* FIXME: implement link target parsing */
            return "<a href=\"#\">&lt;NOTIMPLEMENTED&gt;</a>";
        }
    }

    this.visit_link_anon = this.visit_link;

    this.visit_link_raw = function(item, i, items) {
        return "<a href=\"" + encodeURI(item[1][0]) + "\">" 
            + this.escape(item[1][0]) + "</a>";
    }

    this.visit_error = function(item, i, items) {
        return "<span class=\"showrest-error\">Formatting error: " + this.escape(item[1]) + "</span>";
    }

    /*
     * Parse tokenized input
     */
    this.parse = function(tokens) {
        return tokens;
    }

    /*
     * Tree-tokenize RST input to
     *
     *     [token_id, token_args, token_children]
     *
     * on a line-based block level.
     */
    this.tokenize = function(lines) {
        var top = ['top', null, []];
        var stack = [top];
        var indent_stack = [0];
        var directive_init = false;
        var i;

        lines = this.dedent(lines);

        get_indent = function(n) {
            var t = "";
            var i;
            for (i = 0; i < n; ++i) {
                t += " ";
            }
            return t;
        }

        slurp_indented = function(min_indent) {
            var items = [];
            var first = true;
            ++i;
            while (i < lines.length 
                   && (lines[i][0] > min_indent || !lines[i][1])) {
                if (lines[i][1] && first) {
                    min_indent = lines[i][0];
                }
                items.push(get_indent(lines[i][0] - min_indent) + lines[i][1]);
                ++i;
            }
            --i;
            return items;
        };

        preceding_item = function() {
            if (!stack[0][2] || stack[0][2].length == 0) {
                return [null, null, null];
            } else {
                return stack[0][2][stack[0][2].length-1];
            }
        }

        i = -1;
        while (++i < lines.length) {
            var indent = lines[i][0];
            var text = lines[i][1];
            var next_text;
            var last_empty;
            var m;

            if (i+1 < lines.length) {
                next_text = lines[i+1][1];
            } else {
                next_text = null;
            }

            if (i-1 > 0) {
                last_empty = !lines[i-1][1];
            } else {
                last_empty = true;
            }

            /* 
             * Handle indent 
             */
            if (!text) {
                /* Empty line: no meaningful indent */
                directive_init = false;
                continue;
            } else if (indent > indent_stack[0]) {
                var item = preceding_item();
                if (item[0] == 'directive' || item[0] == 'foot' 
                        || item[0] == 'list') {
                    /* Indent to directive, footnote, or list item */
                    stack.unshift(item);
                    indent_stack.unshift(indent);
                    directive_init = (item[0] == 'directive');
                } else {
                    /* Indented block, apparently */
                    var token = ['block', null, []];
                    stack[0][2].push(token);
                    stack.unshift(token);
                    indent_stack.unshift(indent);
                }
            } else if (indent < indent_stack[0]) {
                /* FIXME: recognize unexpected dedents */

                while (indent_stack[0] > indent) {
                    stack.shift();
                    indent_stack.shift()
                }
            }

            /*
             * Handle blocks
             */


            /* Directive */
            m = text.match(/^\.\.\s+([a-z0-9-]+)::(.*)$/);
            if (m) {
                var token = ['directive', [m[1], m[2]], []];
                stack[0][2].push(token);
                continue
            }

            /* Directive option or field */
            m = text.match(/^:([a-z0-9-]+):([^:].*)?$/);
            if (m) {
                var token = [directive_init ? 'directive_option' : 'field',
                             [m[1], m[2]], null];
                token[1] = token[1].concat(slurp_indented(indent));
                stack[0][2].push(token);
                continue
            }

            directive_init = false;

            /* Footnote or bibliography reference */
            m = text.match(/^\.\.\s+\[(.+)\](\s.*)?/);
            if (m) {
                var token = ['foot', [m[1]], []];
                if (/^\s/.test(m[2])) {
                    token[2].push(['inline', [RegExp.rightContext], null]);
                }
                stack[0][2].push(token);
                continue;
            }

            /* Link target */
            m = text.match(/^\.\.\s+_([a-zA-Z0-9.-]+):\s+(.*)$/);
            if (!m) {
                m = text.match(/^__\s+_([a-zA-Z0-9.-]+)\s+(.*)$/);
            }
            if (m) {
                var token = ['target', [m[1]], null];
                if (m[2]) {
                    token[1] = token[1].concat(m[2]);
                }
                token[1] = token[1].concat(slurp_indented(indent));
                stack[0][2].push(token);
                continue;
            }

            /* Substitution definition */
            m = text.match(/^\.\.\s+\|([a-zA-Z0-9.-]+)\|\s+(.*)$/);
            if (m) {
                var token = ['subst_def', [m[1]], null];
                if (m[2]) {
                    token[1] = token[1].concat(m[2]);
                }
                token[1] = token[1].concat(slurp_indented(indent));
                stack[0][2].push(token);
                continue;
            }

            /* Comment */
            m = text.match(/^\.\.\s+/);
            if (m) {
                slurp_indented(indent);
                continue;
            }

            /* Line block */
            m = text.match(/^\|(.*)?$/);
            if (m) {
                if (/^\s/.test(m[1])) {
                    var item = preceding_item();
                    if (item[0] == 'line') {
                        item[1].push(RegExp.rightContext);
                    } else {
                        var token = ['line', [RegExp.rightContext], null];
                        stack[0][2].push(token);
                    }
                } else {
                    stack[0][2].push(['error', 
                                      ["Invalid substitution reference"], 
                                      null]);
                }
                continue
            }

            /* Preformatted (note the next-line look-ahead check) */
            m = text.match(/^(.*)::\s*$/);
            if (m && next_text == "") {
                if (m[1]) {
                    var token = ['inline', [m[1] + ":"], null];
                    stack[0][2].push(token);
                }
                ++i;
                token = ['pre', slurp_indented(indent).join("\n"), null];
                stack[0][2].push(token);
                continue;
            }

            /* Section markup (look-ahead) */
            if (/^-{3,}$/.test(next_text) || /^={3,}$/.test(next_text) 
                || /^\+{3,}$/.test(next_text) || /^\^{3,}$/.test(next_text)
                || /^#{3,}$/.test(next_text) || /^\*{3,}$/.test(next_text)) {
                if (text.length > next_text.length) {
                    stack[0][2].push(['error', ['Title underline wrong'], 
                                      null]);
                } else {
                    stack[0][2].push(['section', [text, next_text[0]], null]);
                }
                ++i;
                continue;
            }

            /* List items */
            m = text.match(/^(-|\*|\+|\u2022|\u2023|\u2043|#|[a-z0-9]+\.|[a-z0-9]+\)|\([a-z0-9]+\))(.*)$/);
            if (m && (last_empty || preceding_item()[0] != 'inline')
                    && (/^\s/.test(m[2]) || !m[2])) {
                /* FIXME: validate the list marker, eg., for roman numerals */
                stack[0][2].push(['list', [m[1]], []]);

                /* Now, do an evil thing: re-process modified line, so that
                   indentation is processed appropriately */
                lines[i][0] = indent + m[1].length;
                lines[i][1] = m[2];
                --i;
                continue;
            }

            /* FIXME: simple tables */

            /* FIXME: grid tables */

            /* FIXME: definition lists */

            /* FIXME: field lists */

            /* FIXME: option lists */

            /* FIXME: quoted literal blocks */

            /* FIXME: doctest blocks */

            /* FIXME: doctest blocks */

            /* Something else: inline material */
            var item = preceding_item();
            if (item[0] == 'inline' && !last_empty) {
                item[1][0] += " ";
                item[1][0] += text;
            } else {
                stack[0][2].push(['inline', [text], null]);
            }
            continue;
        }

        this.tokenizePostProcess(top);
        return top;
    }

    /*
     * Post-process tokenization: parse inline markup and
     */
    this.tokenizePostProcess = function(top) {
        var stack = [top];

        /* Tokenize all inline markup */
        while (stack.length > 0) {
            var item = stack.shift();

            if (item[2]) {
                stack = item[2].concat(stack);
            }

            if (item[0] == 'inline') {
                if (item[1]) {
                    item[2] = this.tokenizeInline(item[1].join(" "));
                } else {
                    item[2] = [];
                }
                item[1] = null;
            }
        }

        return top;
    }

    /*
     * Inline markup tokenizer
     */
    this.tokenizeInline = function(text) {
        var tokens = [];
        var last_char = " ";
        var inline_markup_ok = true;

        if (!text) {
            return [];
        }

        push = function() {
            if (RegExp.lastMatch.length > 0) {
                last_char = RegExp.lastMatch[RegExp.lastMatch.length-1];
            } else {
                last_char = null;
            }
            text = RegExp.rightContext;
        }

        while (text) {
            inline_markup_ok = /[\s'"(\[{<\-\/:\u2018\u2019\u00ab\u00a1\u00bf\u2010\u2011\u2012\u2013\u2014\u00a0]/.test(last_char);

            if (inline_markup_ok) {
                /* Inline markup allowed: */

                /* Escape */
                m = text.match(/^\\(.)/);
                if (m) {
                    push();
                    tokens.push(['text', [m[1]], null])
                    continue;
                }

                /* Reference */
                m = text.match(/^([a-zA-Z0-9-]+|`[^`]+`)(__|_)/);
                if (m) {
                    push();
                    if (/^`/.test(m[1])) {
                        m[1] = m[1].slice(1, m[1].length - 1);
                    }
                    if (m[2] == '__') {
                        tokens.push(['link_anon', [m[1]], null]);
                    } else {
                        tokens.push(['link', [m[1]], null]);
                    }
                    continue;
                }
                
                /* Footnote reference */
                m = text.match(/^\[([a-zA-Z0-9-]+)\]_/);
                if (m) {
                    push();
                    tokens.push(['foot-ref', [m[1]], null]);
                    continue;
                }
                
                /* Role */
                m = text.match(/^:([a-zA-Z0-9-]+):`([^`]+)`/);
                if (!m) {
                    m = text.match(/^`([^`]+)`:([a-zA-Z0-9-]+):/);
                    if (m) {
                        tmp = m[1];
                        m[1] = m[2];
                        m[2] = tmp;
                    }
                }
                if (m) {
                    push();
                    tokens.push(['role', [m[1], m[2]], null]);
                    continue;
                }

                /* Literal */
                m = text.match(/^``([^`]+)``/);
                if (m) {
                    push();
                    tokens.push(['literal', [m[1]], null]);
                    continue;
                }
                
                /* Default role */
                m = text.match(/^`([a-zA-Z0-9-]+)`/);
                if (m) {
                    push();
                    tokens.push(['role', [null, m[1]], null]);
                    continue;
                }
                
                /* Substitution reference */
                m = text.match(/^\|([a-zA-Z0-9-])\|/);
                if (m) {
                    push();
                    tokens.push(['subst', [m[1]], null]);
                    continue;
                }
                
                /* Strong */
                m = text.match(/^\*\*([^\*:`]+)\*\*/);
                if (m) {
                    push();
                    tokens.push(['strong', [m[1]], null]);
                    continue;
                }

                /* Emphasis */
                m = text.match(/^\*([^\*:`]+)\*/);
                if (m) {
                    push();
                    tokens.push(['emph', [m[1]], null]);
                    continue;
                }
            }

            /* Raw link */
            /* FIXME: should it be separated by sep-chars? */
            m = text.match(/^([^\*`_\\]+\s|)(http:\/\/[^\s,!?]*[^\s.,!?])/);
            if (m) {
                push();
                if (m[1]) {
                    tokens.push(['text', [m[1]], null]);
                }
                tokens.push(['link_raw', [m[2]], null]);
                continue;
            }

            /* Other stuff */
            m = text.match(/([\*`_]+|[a-zA-Z0-9]+_)/);
            if (m) {
                if (RegExp.leftContext.length > 0) {
                    last_char = RegExp.leftContext[RegExp.leftContext.length-1];
                    text = RegExp.lastMatch + RegExp.rightContext;
                    tokens.push(['text', [RegExp.leftContext], null]);
                } else {
                    tokens.push(['error', ["Invalid inline markup: "+text], 
                                 null]);
                    break;
                }
                continue;
            } else {
                tokens.push(['text', [text], null]);
                break;
            }
        }

        return tokens;
    }

    /*
     * Dedent and strip text lines to [(indent_size, text), ...]
     */
    this.dedent = function(text) {
        var lines = text.split("\n");
        var out = [];
        var indent_re = /^\s*/m;
        var i;
        for (i = 0; i < lines.length; ++i) {
            line = lines[i];
            if (indent_re.test(line)) {
                var indent = line.length - RegExp.rightContext.length;
                var text = RegExp.rightContext;
                /\s*$/.test(text);
                out.push([indent, RegExp.leftContext]);
            }
        }
        return out;
    }
}
