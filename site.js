/* global $, React, console */

var d = React.DOM;

var timeSort = function (l, r) {
    return r.created_at.localeCompare(l.created_at);
};

var starterLabels = [
  // N.B. quote labels with spaces and url encode all labels
  {"user": "rust-lang", "label": "E-easy"},
  {"user": "rust-lang", "label": "E-help-wanted"},



];


var extractIssuesFunction = function (numIssueRequests, callback) {
  if (numIssueRequests < 2) {
    console.error("Extract results two or more starterLabels $.when returns an array.");
  }
  return function () {
    var issues = [];
    for (var i = 0; i < numIssueRequests; i++) {
      if (!(arguments[i] && arguments[i][0] && arguments[i][0].items)) {
        console.error("XHR", i, "to fetch issues failed.");
      } else {
        Array.prototype.push.apply(issues, arguments[i][0].items);
      }
    }

    issues.sort(timeSort);
    callback(issues);
  };
};

// https://developer.github.com/v3/search/#search-issues
var searchIssuesUrl = "https://api.github.com/search/issues";

var getPotentiallyOpenIssues = function (starterLabels, callback) {
  var today = new Date();
  var twoWeeksAgo = new Date(today - 86400000 * 14);
  var olderThanTwoWeeks = "<" + twoWeeksAgo.toISOString().slice(0, 10);
  var query = "type:issue+no:assignee+state:open+updated:" + olderThanTwoWeeks;
  var issueXhrs = starterLabels.map(function (starterLabel, index) {
    query += "+label:\""+ starterLabel.label + "\"";
    if (starterLabel.repo) {
      query += "+repo:" + starterLabel.repo;
    } else if (starterLabel.user) {
      query += "+user:" + starterLabel.user;
    } else {
      console.error("No repo or user found for", index, "label: ", starterLabel);
    }
    return $.ajax({
      dataType: "json",
      url: searchIssuesUrl,
      data: "q=" + query + "&sort=updated"
    });
  });

  var dataExtractor = extractIssuesFunction(starterLabels.length, callback);

  $.when.apply($, issueXhrs).done(dataExtractor);
};

var getOpenIssues = function (starterLabels, callback) {
  var query = "type:issue+state:open+no:assignee";
  var issueXhrs = starterLabels.map(function (starterLabel, index) {
    query += "+label:\""+ starterLabel.label + "\"";
    if (starterLabel.repo) {
      query += "+repo:" + starterLabel.repo;
    } else if (starterLabel.user) {
      query += "+user:" + starterLabel.user;
    } else {
      console.error("No repo or user found for", index, "label: ", starterLabel);
    }
    return $.ajax({
      dataType: "json",
      url: searchIssuesUrl,
      data: "q=" + query + "&sort=created"
    });
  });

  var dataExtractor = extractIssuesFunction(starterLabels.length, callback);

  $.when.apply($, issueXhrs).done(dataExtractor);
};

// TODO(g-k): update or remove replacers for rust-lang repos
var replacers = [
  {matcher: /^L-(.*)/, replacement: "Language: "},
  {matcher: /^A-(.*)/, replacement: "Area: "},
  {matcher: /^(?:S-|C-)(.*)/, replacement: "Status: "},
  {matcher: /^P-(.*)/, replacement: "Platform: "},
  {matcher: /^B-(.*)/, replacement: ""},
  {matcher: /^I-(.*)/, replacement: "Category: "}
];

var extractLabel = function (label, regex) {
  return label.match(regex)[1];
};

var makeLabelFriendly = function (label) {
  var newLabel = label;

  var labelMap = {
    "E-easy": "Good first PR",
    "E-Easy": "Good first PR",
    "E-less easy": "Mentored"
  };

  if (labelMap[label]) {
    return labelMap[label];
  }

  replacers.forEach(function (item) {
    if (item.matcher.test(label)) {
      newLabel = item.replacement + extractLabel(label, item.matcher);
    }
  });

  return newLabel;
};

var label = function (data) {
    var color = (data.color === "d7e102" ||
                 data.color === "bfd4f2" ||
                 data.color === "d4c5f9" ||
                 data.color === "02d7e1") ? "black" : "white";

    var friendlyLabel = makeLabelFriendly(data.name);

    return d.span(
        {className: "label", style: {backgroundColor: "#" + data.color, color: color}},
        friendlyLabel
    );
};

var FeelingAdventurous = React.createClass({
    gotoRandomIssue: function () {
        var issues = this.props.issues;

        var randomIndex = Math.floor(Math.random() * (issues.length + 1));

        window.location.href = issues[randomIndex].html_url;
    },

    render: function () {
        return d.button(
            {className: "button", onClick: this.gotoRandomIssue},
            "I'm Feeling Adventurous..."
        );
    }
});

var feelingAdventurous = function (issues) {
    return React.createElement(FeelingAdventurous, {issues: issues});
};

var Labels = React.createClass({
    render: function() {
        return d.div(
            {className: "labels"},
            this.props.labels.map(label)
        );
    }
});

var labels = function (data) {
    return React.createElement(Labels, data);
};


var FilterLabel = React.createClass({
  render: function () {
    var color = (this.props.color === "d7e102" ||
                 this.props.color === "bfd4f2" ||
                 this.props.color === "d4c5f9" ||
                 this.props.color === "02d7e1") ? "black" : "white";

    var friendlyLabel = makeLabelFriendly(this.props.name);
    return d.span({className: "label",
                   style: {backgroundColor: "#" + this.props.color,
                           color: color,
                           cursor: "pointer",
                           opacity: this.props.selected ? 1.0 : 0.5},
                   onClick: this.props.onClick.bind(null, this.props)},
                   friendlyLabel);
  }
});

var filterLabel = function (data) {
  return React.createElement(FilterLabel, data);
};

var WantToWorkOn = React.createClass({
  render: function () {
    return d.span({className: "labels"}, this.props.labels.map(filterLabel));
  }
});

var wantToWorkOn = function (labels, onClick) {
  return React.createElement(WantToWorkOn, {labels: labels.map(function (label) {
    label.onClick = onClick;
    return label;
  })});
};


var repoUrl = function(url) {
    var urlArray = url.split("/");
    return urlArray[urlArray.length - 3];
};

var Issue = React.createClass({

    render: function () {
        return d.li(
            {className: "issue"},
            d.div(
                {},
                "[ ",
                d.a(
                    {
                        className: "issue-link",
                        href: this.props.html_url,
                        title: this.props.title
                    },
                    repoUrl(this.props.html_url) + " " + this.props.number
                ),
                " ] - ",
                d.span(
                    {className: "issue-desc"},
                    this.props.title
                )
            ),
            labels(this.props),
            d.div(
              {className: "time-wrapper"},
              d.span({className: "time"},
              d.i({className: "fa fa-clock-o"}),
              " Last activity: " + moment(this.props.updated_at).fromNow())
            )
        );
    }
});

var issueItem = function (data) {
    return React.createElement(Issue, data);
};

var IssueList = React.createClass({
    getInitialState: function () {
        return {
            limited: true
        };
    },

    getIssuesWithSelectedLabels: function (issues) {
        return issues;
    },

    render: function () {
        if (this.props.loading) {
            return d.div({id: "loading"});
        } else {
            var issues = this.getIssuesWithSelectedLabels(
                this.props.issues, this.props.selectedLabels);

            if (this.state.limited && issues.length > 5) {
                issues = issues.map(issueItem)
                                          .slice(0, 5)
                                          .concat(
                                              d.div(
                                                  {
                                                      className: "view-all",
                                                      onClick: function() {
                                                          this.setState({limited: false});
                                                      }.bind(this)
                                                  },
                                                  "view all..."
                                              )
                                          );
            } else {
                issues = issues.map(issueItem);
            }

            return d.ul(
                {id: "issues"},
                issues
            );
        }
    }
});

var issueList = function (issues, loading, filters) {
    var selectedLabels = filters.filter(function (label) {
        return label.selected;
    });
    return React.createElement(IssueList, {issues: issues, loading: loading, selectedLabels: selectedLabels});
};

var App = React.createClass({
    selectFilter: function (filterProps) {
        for (var i = 0; i < this.state.labelFilters.length; i++) {
            if (this.state.labelFilters[i].name === filterProps.name) {
                break;
            }
        }

        this.setState(function (oldState) {
            var lf = oldState.labelFilters;
            lf[i].selected = !lf[i].selected;
            return {labelFilters: lf};
        });
    },

    componentDidMount: function () {
        getOpenIssues(starterLabels, function (data) {
            this.setState({
                openIssues: data,
                openIssuesLoading: false
            });
        }.bind(this));

        getPotentiallyOpenIssues(starterLabels, function (data) {
            this.setState({
                potentiallyOpenIssues: data,
                potentiallyOpenIssuesLoading: false
            });
        }.bind(this));
    },

    getInitialState: function () {
        return {
            openIssuesLoading: true,
            potentiallyOpenIssuesLoading: true,
            openIssues: [],
            potentiallyOpenIssues: [],
            labelFilters: []
        };
    },

    render: function () {
        return d.div(
            {},
            this.state.openIssuesLoading ? [] : feelingAdventurous(this.state.openIssues),

            (this.state.openIssuesLoading || !this.state.labelFilters.length) ? [] : d.div({className: "label-picker"},
                d.h5({}, "and I want to work on: "),
                wantToWorkOn(this.state.labelFilters, this.selectFilter)),

            d.h2({}, "Open Issues"),
            issueList(this.state.openIssues, this.state.openIssuesLoading, this.state.labelFilters),

            d.h2({}, "Potentially Open Issues"),
            issueList(this.state.potentiallyOpenIssues, this.state.potentiallyOpenIssuesLoading, this.state.labelFilters)
        );
    }
});

React.render(
    React.createElement(App, {}),
    document.getElementById("app")
);
